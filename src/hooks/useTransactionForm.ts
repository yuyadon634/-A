/**
 * 申請フォームの state・バリデーション・Supabase 送信を担うカスタムフック（オーケストレーター）。
 *
 * 責務：
 *  - コアフォーム state の管理（金額・カテゴリ・精算方法・メッセージ・送信中フラグ）
 *  - useReceiptItems を通じたレシート明細の管理
 *  - compressImageToDataUrl / scanReceiptFile を使った OCR フロー
 *  - 送信バリデーションと Supabase INSERT
 */
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getItemRequestedAmount } from '@/lib/transactionUtils';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import { scanReceiptFile } from '@/lib/ocrClient';
import { useReceiptItems } from '@/hooks/useReceiptItems';
import { Transaction, SplitType, User } from '@/types';

// ---------- ローカルユーティリティ（このフック内でのみ使用） ----------

/**
 * 差戻された申請を再編集するとき、元の数値入力欄（customValue）を復元する。
 * DB には requestedAmount しか保存されていないため、splitType に応じて逆算が必要。
 */
function deriveCustomValue(tx: Transaction): string {
  if (tx.splitType === 'amount') return tx.requestedAmount.toString();
  if (tx.splitType === 'percentage' && tx.amount > 0) {
    return Math.round((tx.requestedAmount / tx.amount) * 100).toString();
  }
  return '';
}

/** レシート明細を持つトランザクションか（明細モードで開くかの判定に使用） */
function hasReceiptItems(tx: Transaction): boolean {
  return !!(tx.receiptItems && tx.receiptItems.length > 0);
}

// ---------- フック本体 ----------

export function useTransactionForm(
  currentUser: User,
  onSuccess: (newTx: Transaction) => void,
  initialTransaction?: Transaction,
) {
  // コアフォーム state（編集モードの場合は既存値で初期化）
  const [inputAmount, setInputAmount] = useState(
    initialTransaction ? initialTransaction.amount.toString() : '',
  );
  const [category, setCategory] = useState(initialTransaction?.category ?? '');
  const [splitType, setSplitType] = useState<SplitType>(
    // 明細モードの場合は splitType を 'none' に戻す（明細側で個別に管理するため）
    initialTransaction && !hasReceiptItems(initialTransaction) ? initialTransaction.splitType : 'none',
  );
  const [customValue, setCustomValue] = useState(
    initialTransaction && !hasReceiptItems(initialTransaction)
      ? deriveCustomValue(initialTransaction)
      : '',
  );
  const [message, setMessage] = useState(initialTransaction?.message ?? '');
  const [isScanning, setIsScanning] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(
    initialTransaction?.receiptImageUrl ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  /**
   * 非同期の送信処理中に同じボタンが再度押されても二重送信しないための同期ガード。
   * state（isSubmitting）は React の非同期更新のため、同一イベントループ内では確実でない。
   */
  const preventDoubleSubmitRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // レシート明細の管理を専用フックに委譲
  const receiptItems = useReceiptItems(
    initialTransaction && hasReceiptItems(initialTransaction)
      ? (initialTransaction.receiptItems ?? null)
      : null,
    setInputAmount,
  );

  // 明細モード判定（複数箇所で参照するためローカル変数化して重複を排除）
  const isItemizedMode = !!(receiptItems.scannedItems && receiptItems.scannedItems.length > 0);

  // ---------- 金額計算 ----------

  /** 明細モード時はチェック済みアイテムの合計、通常モード時は手動入力値を返す */
  const getSharedTotal = (): number => {
    if (isItemizedMode) {
      return receiptItems.scannedItems!
        .filter(item => item.selected)
        .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }
    return parseInt(inputAmount, 10) || 0;
  };

  /** 相手に請求する金額を算出する */
  const getRequestedAmount = (): number => {
    if (isItemizedMode) {
      return receiptItems.scannedItems!.reduce(
        (sum, item) => sum + getItemRequestedAmount(item),
        0,
      );
    }
    const parsedAmount = parseInt(inputAmount, 10) || 0;
    if (splitType === 'none') return 0;
    if (splitType === 'split') return Math.floor(parsedAmount / 2);
    if (splitType === 'full') return parsedAmount;
    const parsedCustomValue = parseInt(customValue, 10) || 0;
    // 指定金額が総額を超えていたら総額を上限にする
    if (splitType === 'amount') return parsedCustomValue > parsedAmount ? parsedAmount : parsedCustomValue;
    if (splitType === 'percentage') return Math.floor(parsedAmount * (parsedCustomValue / 100));
    return 0;
  };

  // ---------- OCR フロー ----------

  /**
   * カメラ撮影またはファイル選択で呼ばれる共通ハンドラ。
   * OCR（API fetch）と画像圧縮（ローカル Canvas 処理）を Promise.all で並行実行し、
   * 合計待ち時間を短縮する。
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // 前回のスキャンが進行中なら中断して新しいスキャンを優先する
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    receiptItems.setScannedItems(null);
    setReceiptImageUrl(null);

    try {
      const [newItems, compressedImageUrl] = await Promise.all([
        scanReceiptFile(file, controller.signal),
        compressImageToDataUrl(file),
      ]);

      // 別の画像が選択されて controller が差し替わっていたらこの結果は捨てる
      if (abortControllerRef.current !== controller) return;

      if (newItems.length > 0) {
        receiptItems.setScannedItems(newItems);
        const ocrTotal = newItems.reduce((sum, item) => sum + item.price, 0);
        setInputAmount(ocrTotal.toString());
      }

      setReceiptImageUrl(compressedImageUrl);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('OCR error:', err);
      const userMessage =
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'レシートの読み取りに失敗しました。明るい場所で撮り直してみてください。';
      alert(userMessage);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsScanning(false);
      }
    }
  };

  // ---------- フォームリセット ----------

  const resetForm = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setInputAmount('');
    setCategory('');
    setSplitType('none');
    setCustomValue('');
    setMessage('');
    receiptItems.setScannedItems(null);
    setReceiptImageUrl(null);
    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // ---------- 送信バリデーション & Supabase INSERT ----------

  const handleSubmit = async () => {
    if (preventDoubleSubmitRef.current) return;

    const parsedAmount = parseInt(inputAmount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('金額を入力してください');
      return;
    }

    if (isItemizedMode) {
      const hasItemWithNoSplit = receiptItems.scannedItems!.some(
        item => item.selected && item.splitType === 'none',
      );
      if (hasItemWithNoSplit) {
        alert(
          '精算方法が選ばれていない項目があります。\nチェックした項目すべてに「割り勘」などを設定してください。',
        );
        return;
      }
    } else {
      if (splitType === 'none') {
        alert('精算方法（割り勘など）を選択してください。');
        return;
      }
    }

    const requestedAmount = getRequestedAmount();
    const newTxData: Record<string, unknown> = {
      date: new Date().toISOString().split('T')[0],
      amount: parsedAmount,
      paid_by: currentUser,
      requested_amount: requestedAmount,
      // 明細モードの場合、個別設定が異なるため split_type は 'split' に統一する
      split_type: isItemizedMode ? 'split' : splitType,
      status: 'pending',
      category: category,
      receipt_items: receiptItems.scannedItems || [],
      message: message.trim() || null,
    };
    // receipt_image_url はオプションカラムのため、値がある場合のみ追加する
    if (receiptImageUrl) newTxData.receipt_image_url = receiptImageUrl;

    preventDoubleSubmitRef.current = true;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTxData])
        .select()
        .single();

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }

      if (data) {
        const newTx: Transaction = {
          id: data.id.toString(),
          date: data.date,
          amount: data.amount,
          paidBy: data.paid_by as User,
          requestedAmount: data.requested_amount,
          splitType: data.split_type,
          status: data.status,
          category: data.category as string,
          receiptItems: data.receipt_items || [],
          receiptImageUrl: data.receipt_image_url || undefined,
          message: data.message || undefined,
        };
        onSuccess(newTx);
        resetForm();
      }
    } catch (err) {
      console.error('Submit Error:', err);
      alert('申請に失敗しました。');
    } finally {
      preventDoubleSubmitRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    // コアフォーム state
    inputAmount,
    setInputAmount,
    category,
    setCategory,
    splitType,
    setSplitType,
    customValue,
    setCustomValue,
    message,
    setMessage,
    isScanning,
    receiptImageUrl,
    setReceiptImageUrl,
    isSubmitting,
    // refs
    fileInputRef,
    galleryInputRef,
    // レシート明細（useReceiptItems から展開）
    scannedItems: receiptItems.scannedItems,
    setScannedItems: receiptItems.setScannedItems,
    toggleItemSelection: receiptItems.toggleItemSelection,
    updateItemSplit: receiptItems.updateItemSplit,
    updateItemCustomValue: receiptItems.updateItemCustomValue,
    updateItemDetail: receiptItems.updateItemDetail,
    bulkUpdateSplit: receiptItems.bulkUpdateSplit,
    addManualItem: receiptItems.addManualItem,
    deleteItem: receiptItems.deleteItem,
    // 計算・OCR・送信
    getSharedTotal,
    getRequestedAmount,
    handleFileChange,
    resetForm,
    handleSubmit,
  };
}
