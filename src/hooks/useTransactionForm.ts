import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getItemRequestedAmount } from '@/lib/utils';
import { Transaction, ReceiptItem, SplitType, User } from '@/types';

/**
 * レシート画像をクライアント側で圧縮し、data URL として返す。
 * Supabase Storage 不要で DB の TEXT カラムに直接保存できる。
 * 最大辺 800px・JPEG 品質 65% に圧縮（目安: 70〜180KB → base64 で 100〜250KB）
 */
function compressImageToDataUrl(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_PX = 800;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_PX) { height = Math.round((height * MAX_PX) / width); width = MAX_PX; }
      } else {
        if (height > MAX_PX) { width = Math.round((width * MAX_PX) / height); height = MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); resolve(null); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
    img.src = objectUrl;
  });
}

/** OCR APIレスポンスのアイテムをランタイムで型検証 */
function isOcrItem(v: unknown): v is { name: string; price: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).name === 'string' &&
    typeof (v as Record<string, unknown>).price === 'number'
  );
}

/** 既存トランザクションから手動入力の customValue を逆算する */
function deriveCustomValue(tx: Transaction): string {
  if (tx.splitType === 'amount') return tx.requestedAmount.toString();
  if (tx.splitType === 'percentage' && tx.amount > 0) {
    return Math.round((tx.requestedAmount / tx.amount) * 100).toString();
  }
  return '';
}

/** 既存トランザクションのレシート明細があるか（明細モードか） */
function hasReceiptItems(tx: Transaction): boolean {
  return !!(tx.receiptItems && tx.receiptItems.length > 0);
}


export function useTransactionForm(
  currentUser: User,
  onSuccess: (newTx: Transaction) => void,
  initialTransaction?: Transaction,
) {
  const init = initialTransaction;
  const [inputAmount, setInputAmount] = useState(init ? init.amount.toString() : '');
  const [category, setCategory] = useState(init?.category ?? '');
  const [splitType, setSplitType] = useState<SplitType>(
    init && !hasReceiptItems(init) ? init.splitType : 'none',
  );
  const [customValue, setCustomValue] = useState(
    init && !hasReceiptItems(init) ? deriveCustomValue(init) : '',
  );
  const [message, setMessage] = useState(init?.message ?? '');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ReceiptItem[] | null>(
    init && hasReceiptItems(init) ? (init.receiptItems ?? null) : null,
  );
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(
    init?.receiptImageUrl ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // カメラ用 input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ギャラリー/ファイル選択用 input ref
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 二重送信防止（state は非同期なので Ref で同期ガード）
  const isSubmittingRef = useRef(false);
  // アンマウント後の setState 防止 + スキャン中のキャンセル
  const abortControllerRef = useRef<AbortController | null>(null);

  const getSharedTotal = (): number => {
    if (scannedItems && scannedItems.length > 0) {
      return scannedItems
        .filter(item => item.selected)
        .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }
    return parseInt(inputAmount, 10) || 0;
  };

  const getRequestedAmount = (): number => {
    if (scannedItems && scannedItems.length > 0) {
      return scannedItems.reduce((sum, item) => sum + getItemRequestedAmount(item), 0);
    }
    const numAmount = parseInt(inputAmount, 10) || 0;
    if (splitType === 'none') return 0;
    if (splitType === 'split') return Math.floor(numAmount / 2);
    if (splitType === 'full') return numAmount;
    const numCustom = parseInt(customValue, 10) || 0;
    if (splitType === 'amount') return numCustom > numAmount ? numAmount : numCustom;
    if (splitType === 'percentage') return Math.floor(numAmount * (numCustom / 100));
    return 0;
  };

  /**
   * カメラ撮影またはファイル選択で呼ばれる共通ハンドラ。
   * OCR（fetch）と画像アップロード（Supabase Storage）を並行実行する。
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // 前回のスキャンが進行中なら中断して新しいスキャンを開始
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setScannedItems(null);
    setReceiptImageUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // OCRと画像圧縮を並行実行（圧縮はローカル処理のため Storage 不要）
      const [res, imageUrl] = await Promise.all([
        fetch('/api/ocr', { method: 'POST', body: formData, signal: controller.signal }),
        compressImageToDataUrl(file),
      ]);

      // 別の選択が行われていたらスキップ
      if (abortControllerRef.current !== controller) return;

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ?? 'レシートの読み取りに失敗しました',
        );
      }

      const data: unknown = await res.json();
      const items = (data as { items?: unknown }).items;

      if (Array.isArray(items)) {
        const newItems: ReceiptItem[] = items.filter(isOcrItem).map(item => ({
          id: crypto.randomUUID(),
          name: item.name || '不明な項目',
          price: item.price || 0,
          selected: true,
          splitType: 'none' as SplitType,
          customValue: '',
        }));
        setScannedItems(newItems);
        const total = newItems.reduce((sum, item) => sum + item.price, 0);
        setInputAmount(total.toString());
      }

      // アップロードが成功していれば URL を保持（失敗時は null のまま）
      setReceiptImageUrl(imageUrl);
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

  const toggleItemSelection = (id: string) => {
    setScannedItems(prev =>
      prev ? prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item)) : null,
    );
  };

  const updateItemSplit = (id: string, newSplitType: SplitType) => {
    setScannedItems(prev =>
      prev
        ? prev.map(item => (item.id === id ? { ...item, splitType: newSplitType } : item))
        : null,
    );
  };

  const updateItemCustomValue = (id: string, val: string) => {
    setScannedItems(prev =>
      prev
        ? prev.map(item => (item.id === id ? { ...item, customValue: val } : item))
        : null,
    );
  };

  const updateItemDetail = (id: string, field: 'name' | 'price', val: string) => {
    setScannedItems(prev => {
      if (!prev) return null;
      const newItems = prev.map(item => {
        if (item.id !== id) return item;
        return { ...item, [field]: field === 'price' ? (parseInt(val, 10) || 0) : val };
      });
      if (field === 'price') {
        const total = newItems.reduce((sum, item) => sum + item.price, 0);
        setInputAmount(total.toString());
      }
      return newItems;
    });
  };

  /** チェック済み（selected）の全アイテムに一括で splitType を適用する */
  const bulkUpdateSplit = (splitType: SplitType, customValue: string = '') => {
    setScannedItems(prev =>
      prev
        ? prev.map(item =>
            item.selected
              ? {
                  ...item,
                  splitType,
                  customValue: splitType === 'amount' || splitType === 'percentage' ? customValue : '',
                }
              : item,
          )
        : null,
    );
  };

  const addManualItem = () => {
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      selected: true,
      splitType: 'none',
      customValue: '',
    };
    setScannedItems(prev => {
      if (!prev) {
        // 初回：明細モードに入る時点で inputAmount を 0 に初期化
        setInputAmount('0');
        return [newItem];
      }
      return [...prev, newItem];
    });
  };

  const deleteItem = (id: string) => {
    setScannedItems(prev => {
      if (!prev) return null;
      const newItems = prev.filter(item => item.id !== id);
      const total = newItems.reduce((sum, item) => sum + item.price, 0);
      setInputAmount(total.toString());
      return newItems;
    });
  };

  const resetForm = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setInputAmount('');
    setCategory('');
    setSplitType('none');
    setCustomValue('');
    setMessage('');
    setScannedItems(null);
    setReceiptImageUrl(null);
    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const numAmount = parseInt(inputAmount, 10);
    if (!numAmount || numAmount <= 0) {
      alert('金額を入力してください');
      return;
    }

    if (scannedItems && scannedItems.length > 0) {
      const hasUnselectedSplit = scannedItems.some(
        item => item.selected && item.splitType === 'none',
      );
      if (hasUnselectedSplit) {
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
    // receipt_image_url カラムが DB に存在しない場合でも動くよう、
    // null 値のオプションカラムはペイロードに含めない
    const newTxData: Record<string, unknown> = {
      date: new Date().toISOString().split('T')[0],
      amount: numAmount,
      paid_by: currentUser,
      requested_amount: requestedAmount,
      split_type: scannedItems && scannedItems.length > 0 ? 'split' : splitType,
      status: 'pending',
      category: category,
      receipt_items: scannedItems || [],
      message: message.trim() || null,
    };
    if (receiptImageUrl) newTxData.receipt_image_url = receiptImageUrl;

    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
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
    scannedItems,
    setScannedItems,
    receiptImageUrl,
    setReceiptImageUrl,
    isSubmitting,
    fileInputRef,
    galleryInputRef,
    getSharedTotal,
    getRequestedAmount,
    handleFileChange,
    toggleItemSelection,
    updateItemSplit,
    updateItemCustomValue,
    updateItemDetail,
    bulkUpdateSplit,
    addManualItem,
    deleteItem,
    resetForm,
    handleSubmit,
  };
}
