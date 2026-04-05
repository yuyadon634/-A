'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2, ScanLine } from 'lucide-react';
import { Transaction, User } from '@/types';
import { getCategoryIcon } from '@/lib/categoryUtils';
import { ReceiptImageModal } from '@/components/modals/ReceiptImageModal';

interface CompletedHistoryProps {
  completedTransactions: Transaction[];
  getDisplayName: (user: User | undefined) => string;
}

export function CompletedHistory({
  completedTransactions,
  getDisplayName,
}: CompletedHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  if (completedTransactions.length === 0) return null;

  return (
    <section className="pt-2 pb-6">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest px-3 py-3 bg-gray-100/50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-gray-400" /> 過去の精算済み履歴
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-2 mt-3 opacity-80 pl-2 border-l-2 border-gray-100">
          {completedTransactions.map(tx => (
            <div
              key={tx.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center opacity-80 grayscale-[30%]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  {getCategoryIcon(tx.category)}
                </div>
                <div>
                  <p className="font-medium text-gray-700 text-sm">
                    {tx.category} / ¥{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {getDisplayName(tx.paidBy)}支払 ・ {tx.date}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-xs font-bold text-gray-600">
                  請求: ¥{tx.requestedAmount.toLocaleString()}
                </p>
                <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block">
                  精算済
                </span>
                {tx.receiptImageUrl && (
                  <button
                    onClick={() => setReceiptUrl(tx.receiptImageUrl!)}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ScanLine size={11} /> レシート
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {receiptUrl && (
        <ReceiptImageModal imageUrl={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </section>
  );
}
