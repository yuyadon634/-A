'use client';

import { useState } from 'react';
import { CornerDownLeft, MessageSquare, PenLine, ChevronDown, ScanLine, Trash2 } from 'lucide-react';
import { Transaction, User } from '@/types';
import { getCategoryIcon } from '@/lib/categoryUtils';
import { ReceiptItemAccordion } from './TransactionCard';
import { ReceiptImageModal } from '@/components/modals/ReceiptImageModal';

interface MyRejectedListProps {
  myRejectedTransactions: Transaction[];
  currentUser: User;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export function MyRejectedList({ myRejectedTransactions, currentUser, onEdit, onDelete }: MyRejectedListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const ownRejected = myRejectedTransactions.filter(tx => tx.paidBy === currentUser);

  if (ownRejected.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section>
      <div className="bg-orange-500 rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 shadow-md shadow-orange-500/20">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <CornerDownLeft size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">差戻しされた申請があります</p>
          <p className="text-orange-100 text-xs mt-0.5">
            内容を確認し、修正して再申請してください
          </p>
        </div>
        <span className="bg-white text-orange-600 font-black text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0 animate-pulse">
          {ownRejected.length}
        </span>
      </div>

      <div className="space-y-3">
        {ownRejected.map(tx => {
          const isExpanded = expandedId === tx.id;
          const hasDetails = !!(
            (tx.receiptItems && tx.receiptItems.length > 0) || tx.receiptImageUrl
          );

          return (
            <div
              key={tx.id}
              className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden"
            >
              <div
                className={`flex justify-between items-start p-4 pb-3 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && toggleExpand(tx.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-orange-50 p-1.5 rounded-lg text-orange-400">
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {tx.category} / ¥{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                    差戻し
                  </span>
                  {hasDetails && (
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
              </div>

              <div className="px-4 pb-3">
                {tx.rejectMessage ? (
                  <div className="flex items-start gap-2 relative pl-1">
                    <div className="absolute top-2.5 left-2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-orange-50 border-b-[6px] border-b-transparent" />
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl rounded-tl-sm px-4 py-2.5 ml-3 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 text-orange-600">
                        <MessageSquare size={12} className="opacity-80" />
                        <span className="text-[10px] font-bold">相手からのコメント</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {tx.rejectMessage}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 pl-1">コメントなし</p>
                )}
              </div>

              {isExpanded && hasDetails && (
                <div className="px-4 pb-3">
                  <ReceiptItemAccordion tx={tx} />
                </div>
              )}

              {tx.receiptImageUrl && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => setReceiptUrl(tx.receiptImageUrl!)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 py-2 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <ScanLine size={14} /> レシートを見る
                  </button>
                </div>
              )}

              <div className="px-4 pb-4 space-y-2">
                <button
                  type="button"
                  onClick={() => onEdit(tx)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 transition-colors"
                >
                  <PenLine size={15} /> 内容を修正して再申請する
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(tx.id)}
                  className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={15} className="text-gray-500" /> この申請を削除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {receiptUrl && (
        <ReceiptImageModal imageUrl={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </section>
  );
}
