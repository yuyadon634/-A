'use client';

import {
  Plus,
  Camera,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Paperclip,
  MessageSquare,
  ScanLine,
} from 'lucide-react';
import { useState } from 'react';
import { SplitType, Transaction, User, ResubmitData } from '@/types';
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { ReceiptItemRow } from '@/components/transaction/ReceiptItemRow';
import { BulkSplitSetter } from '@/components/transaction/BulkSplitSetter';
import { ReceiptImageModal } from './ReceiptImageModal';

interface AddTransactionModalProps {
  currentUser: User;
  otherDisplayName: string;
  onSuccess?: (newTx: Transaction) => void;
  onClose: () => void;
  editTransaction?: Transaction;
  onResubmit?: (id: string, data: ResubmitData) => Promise<void>;
}

export function AddTransactionModal({
  currentUser,
  otherDisplayName,
  onSuccess,
  onClose,
  editTransaction,
  onResubmit,
}: AddTransactionModalProps) {
  const isEditMode = !!editTransaction;
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  const form = useTransactionForm(
    currentUser,
    newTx => {
      onSuccess?.(newTx);
      onClose();
    },
    editTransaction,
  );

  const handleClose = () => {
    form.resetForm();
    onClose();
  };

  const handleResubmitClick = async () => {
    if (!editTransaction || !onResubmit) return;
    const numAmount = parseInt(form.inputAmount, 10);
    if (!numAmount || numAmount <= 0) {
      alert('金額を入力してください');
      return;
    }
    if (form.scannedItems && form.scannedItems.length > 0) {
      if (form.scannedItems.some(item => item.selected && item.splitType === 'none')) {
        alert('精算方法が選ばれていない項目があります。\nチェックした項目すべてに「割り勘」などを設定してください。');
        return;
      }
    } else {
      if (form.splitType === 'none') {
        alert('精算方法（割り勘など）を選択してください。');
        return;
      }
    }
    try {
      setIsResubmitting(true);
      await onResubmit(editTransaction.id, {
        amount: numAmount,
        category: form.category,
        splitType: form.scannedItems && form.scannedItems.length > 0 ? 'split' : form.splitType,
        requestedAmount: form.getRequestedAmount(),
        receiptItems: form.scannedItems || [],
        receiptImageUrl: form.receiptImageUrl || undefined,
        message: form.message,
      });
      onClose();
    } finally {
      setIsResubmitting(false);
    }
  };

  const isSubmitting = isEditMode ? isResubmitting : form.isSubmitting;
  const handleSubmitOrResubmit = isEditMode ? handleResubmitClick : form.handleSubmit;

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      <header className="flex items-center justify-between p-4 bg-white relative z-10 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={handleClose}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-base font-bold text-gray-800 ml-1">
            {isEditMode ? '内容を修正して再申請' : '立替の申請'}
          </h2>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-40">
        <div className="max-w-lg mx-auto space-y-8">

          {/* ステップ1：レシート撮影 / 写真添付 / 基本情報 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="font-bold text-gray-800">レシート読み取り・基本情報</h3>
            </div>

            {!form.scannedItems ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={form.handleFileChange}
                    ref={form.fileInputRef}
                    disabled={form.isScanning}
                    className="hidden"
                    id="camera-input"
                  />
                  <label
                    htmlFor="camera-input"
                    className={`flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer select-none
                      ${form.isScanning ? 'border-blue-200 bg-blue-50/50 pointer-events-none' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
                  >
                    {form.isScanning ? (
                      <Loader2 size={28} className="text-blue-500 animate-spin" />
                    ) : (
                      <div className="bg-blue-50 p-2.5 rounded-full text-blue-600">
                        <Camera size={24} />
                      </div>
                    )}
                    <div className="text-center">
                      <span className="text-xs font-bold block text-gray-800">
                        {form.isScanning ? '読み取り中...' : 'カメラで撮る'}
                      </span>
                    </div>
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={form.handleFileChange}
                    ref={form.galleryInputRef}
                    disabled={form.isScanning}
                    className="hidden"
                    id="gallery-input"
                  />
                  <label
                    htmlFor="gallery-input"
                    className={`flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer select-none
                      ${form.isScanning ? 'border-gray-200 bg-gray-50/50 pointer-events-none' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
                  >
                    <div className={`p-2.5 rounded-full ${form.isScanning ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                      <Paperclip size={24} />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold block text-gray-800">写真を添付</span>
                    </div>
                  </label>
                </div>

                {!form.isScanning && (
                  <button
                    onClick={form.addManualItem}
                    className="w-full bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold py-3 rounded-xl transition-colors text-sm shadow-sm"
                  >
                    レシートなしで明細を手動入力する
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center border border-blue-100">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> 明細入力モード
                </span>
                <button
                  onClick={() => {
                    form.setScannedItems(null);
                    form.setReceiptImageUrl(null);
                    form.setInputAmount('');
                  }}
                  className="text-xs text-blue-600 bg-white px-2 py-1.5 rounded shadow-sm hover:bg-gray-50 transition-colors font-semibold"
                >
                  再スキャン
                </button>
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">
                  用途（カテゴリ）
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => form.setCategory(e.target.value)}
                  placeholder="お店の名前や用途（例：スーパー、〇〇代）"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 outline-none font-medium"
                />
              </div>
              {!form.scannedItems && (
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">
                    合計金額（手入力も可）
                  </label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    <span className="text-gray-500 font-bold mr-1">¥</span>
                    <input
                      type="number"
                      value={form.inputAmount}
                      onChange={e => form.setInputAmount(e.target.value)}
                      className="w-full bg-transparent text-lg font-bold text-gray-900 outline-none py-2.5"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ステップ2：明細の確認と請求対象の選択 */}
          {form.scannedItems && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h3 className="font-bold text-gray-800">明細の確認と負担設定</h3>
                </div>
              </div>

              {form.receiptImageUrl && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-gray-500" />
                      <p className="text-xs font-medium text-gray-600">添付レシート（お互いに確認できます）</p>
                    </div>
                    <button
                      onClick={() => setReceiptModalUrl(form.receiptImageUrl)}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ScanLine size={12} /> 大きく見る
                    </button>
                  </div>
                  <button
                    onClick={() => setReceiptModalUrl(form.receiptImageUrl)}
                    className="w-full block active:opacity-80 transition-opacity"
                  >
                    <img
                      src={form.receiptImageUrl}
                      alt="添付レシート"
                      className="w-full object-contain max-h-48"
                    />
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                  <ImageIcon size={16} className="text-blue-600" />
                  <p className="text-xs font-medium text-blue-800">
                    相手に請求する項目にチェックを入れ、負担割合を設定してください
                  </p>
                </div>

                <BulkSplitSetter onApply={form.bulkUpdateSplit} />

                <div className="divide-y divide-gray-100">
                  {form.scannedItems.map(item => (
                    <ReceiptItemRow
                      key={item.id}
                      item={item}
                      onToggleSelection={form.toggleItemSelection}
                      onUpdateSplit={form.updateItemSplit}
                      onUpdateCustomValue={form.updateItemCustomValue}
                      onUpdateDetail={form.updateItemDetail}
                      onDelete={form.deleteItem}
                    />
                  ))}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                  <button
                    onClick={form.addManualItem}
                    className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={16} /> 手動で項目を追加する
                  </button>
                </div>

                <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-600">共通の支払総額</span>
                  <span className="text-xl font-bold text-gray-900">
                    ¥{form.getSharedTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ステップ2（代替）：手動入力のみの場合の負担方法選択 */}
          {form.inputAmount && !form.scannedItems && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h3 className="font-bold text-gray-800">相手への請求額</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  {(['none', 'split', 'full', 'amount', 'percentage'] as SplitType[]).map(type => {
                    const labels: Record<SplitType, string> = {
                      none: '未設定',
                      split: '割り勘',
                      full: '全額',
                      amount: '金額',
                      percentage: '割合',
                    };
                    return (
                      <button
                        key={type}
                        onClick={() => form.setSplitType(type)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          form.splitType === type
                            ? type === 'none'
                              ? 'bg-white text-gray-700 shadow-sm'
                              : 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>

                {form.splitType !== 'split' && form.splitType !== 'none' && form.splitType !== 'full' && (
                  <div className="mb-6 flex justify-center items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {form.splitType === 'amount' ? '相手の負担額:' : '相手の負担割合:'}
                    </span>
                    <input
                      type="number"
                      value={form.customValue}
                      onChange={e => form.setCustomValue(e.target.value)}
                      placeholder="0"
                      className="w-24 text-xl font-bold border-b-2 border-gray-300 focus:border-blue-600 outline-none text-center pb-1 bg-transparent"
                    />
                    <span className="text-sm font-medium text-gray-600">
                      {form.splitType === 'amount' ? '円' : '%'}
                    </span>
                  </div>
                )}

                <div className="text-center pt-2">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    最終的に {otherDisplayName} に請求する額
                  </p>
                  <p className="text-4xl font-black text-blue-600">
                    ¥{form.getRequestedAmount().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 最終的な結果表示（明細ありの場合） */}
          {form.scannedItems && (
            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl animate-in fade-in duration-500">
              <div className="text-center pt-2">
                <p className="text-xs font-bold text-gray-500 mb-1">
                  最終的に {otherDisplayName} に請求する合計額
                </p>
                <p className="text-4xl font-black text-blue-600">
                  ¥{form.getRequestedAmount().toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* ひとことメッセージ */}
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <MessageSquare size={14} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm">思いやりコメント（任意）</h3>
            </div>
            <textarea
              value={form.message}
              onChange={e => form.setMessage(e.target.value)}
              placeholder="例：大きい金額の立替ありがとう！など"
              rows={2}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 outline-none resize-none shadow-sm transition-all placeholder:text-gray-400"
            />
          </div>

        </div>
      </main>

      {receiptModalUrl && (
        <ReceiptImageModal imageUrl={receiptModalUrl} onClose={() => setReceiptModalUrl(null)} />
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 pb-safe z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmitOrResubmit}
            disabled={
              !form.inputAmount ||
              parseInt(form.inputAmount, 10) <= 0 ||
              form.isScanning ||
              isSubmitting
            }
            className={`w-full disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl shadow-md active:scale-[0.99] transition-all flex justify-center items-center gap-2 ${
              isEditMode
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" /> {isEditMode ? '再申請中...' : '申請中...'}
              </>
            ) : isEditMode ? (
              `修正して再申請する`
            ) : (
              `${otherDisplayName} に申請する`
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
