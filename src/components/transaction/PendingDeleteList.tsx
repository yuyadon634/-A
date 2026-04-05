'use client';

import { Check, X } from 'lucide-react';
import { Transaction, User } from '@/types';
import { getCategoryIcon } from '@/lib/categoryUtils';

interface PendingDeleteListProps {
  pendingDeleteTransactions: Transaction[];
  getDisplayName: (user: User | undefined) => string;
  onApproveDelete: (id: string) => void;
  onRejectDelete: (id: string) => void;
}

export function PendingDeleteList({
  pendingDeleteTransactions,
  getDisplayName,
  onApproveDelete,
  onRejectDelete,
}: PendingDeleteListProps) {
  if (pendingDeleteTransactions.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-bold text-red-500 mb-3 uppercase tracking-widest px-1">
        削除の同意待ち
      </h2>
      <div className="space-y-3">
        {pendingDeleteTransactions.map(tx => (
          <div
            key={tx.id}
            className="bg-red-50/50 p-4 rounded-xl shadow-sm border border-red-100"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                    削除申請: {getDisplayName(tx.deleteRequestedBy)}
                  </span>
                  <span className="text-xs text-gray-500">{tx.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <div className="bg-white p-1 rounded text-gray-500">
                    {getCategoryIcon(tx.category)}
                  </div>
                  <p className="font-medium text-sm">
                    {tx.category} / ¥{tx.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3 border-l-2 border-red-200 pl-2">
              「このデータを削除したい」というリクエストが届いています。
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => onRejectDelete(tx.id)}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-1.5 transition-colors border border-gray-200"
              >
                <X size={16} /> 拒否する
              </button>
              <button
                onClick={() => onApproveDelete(tx.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check size={16} /> 同意して削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
