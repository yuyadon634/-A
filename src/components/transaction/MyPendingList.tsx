'use client';

import { useState } from 'react';
import { Clock, ChevronDown, MessageSquare, ScanLine } from 'lucide-react';
import { Transaction } from '@/types';
import { getCategoryIcon } from '@/lib/categoryUtils';
import { ReceiptItemAccordion } from './TransactionCard';
import { ReceiptImageModal } from '@/components/modals/ReceiptImageModal';
import { getDaysElapsed, getOverdueBadge } from '@/lib/dateUtils';

interface MyPendingListProps {
  myPendingTransactions: Transaction[];
}

export function MyPendingList({ myPendingTransactions }: MyPendingListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  if (myPendingTransactions.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
          <Clock size={15} className="text-blue-500" />
          申請中
        </h2>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          {myPendingTransactions.length}件
        </span>
      </div>

      <div className="space-y-2">
        {myPendingTransactions.map(tx => {
          const isExpanded = expandedId === tx.id;
          const hasDetails = !!(
            (tx.receiptItems && tx.receiptItems.length > 0) || tx.receiptImageUrl
          );
          const daysElapsed = getDaysElapsed(tx.date);
          const overdueBadge = getOverdueBadge(daysElapsed);

          return (
            <div
              key={tx.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${overdueBadge ? 'border-amber-200' : 'border-gray-100'}`}
            >
              <div
                className={`flex items-center justify-between p-4 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && toggleExpand(tx.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {tx.category} / ¥{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">請求額</p>
                    <p className="text-sm font-bold text-gray-700">
                      ¥{tx.requestedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                      <Clock size={10} className="shrink-0" />
                      申請中
                    </span>
                    {overdueBadge && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${overdueBadge.colorClass}`}>
                        <Clock size={10} className="shrink-0" />
                        相手が{daysElapsed}日未対応
                      </span>
                    )}
                    {hasDetails && (
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {tx.message && (
                <div className="px-4 pb-3 flex items-start gap-2 relative pl-5">
                  <div className="absolute top-2.5 left-6 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-100 border-b-[6px] border-b-transparent" />
                  <div className="bg-gray-100/80 rounded-2xl rounded-tl-sm px-4 py-2.5 ml-3 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 text-gray-500">
                      <MessageSquare size={12} className="opacity-70" />
                      <span className="text-[10px] font-bold opacity-80">あなたのひとこと</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {tx.message}
                    </p>
                  </div>
                </div>
              )}

              {isExpanded && hasDetails && (
                <div className="px-4 pb-3">
                  <ReceiptItemAccordion tx={tx} />
                </div>
              )}

              {tx.receiptImageUrl && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setReceiptUrl(tx.receiptImageUrl!)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ScanLine size={14} /> レシートを見る
                  </button>
                </div>
              )}
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
