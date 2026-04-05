'use client';

import { Check, X, CheckCircle2 } from 'lucide-react';
import { Transaction, User } from '@/types';

interface SettlementRequestCardProps {
  pendingSettlementRequests: Transaction[];
  getDisplayName: (user: User | undefined) => string;
  onApprove: () => void;
  onReject: () => void;
}

export function SettlementRequestCard({
  pendingSettlementRequests,
  getDisplayName,
  onApprove,
  onReject,
}: SettlementRequestCardProps) {
  if (pendingSettlementRequests.length === 0) return null;

  return (
    <section>
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <CheckCircle2 size={18} /> 精算リセットの同意待ち
        </h2>
        <p className="text-xs text-emerald-50 mb-4 leading-relaxed bg-black/10 p-3 rounded-xl border border-white/10">
          {getDisplayName(pendingSettlementRequests[0].settlementRequestedBy)}{' '}
          さんから「現金等での清算が完了したため、アプリの計算をリセット（チャラ）したい」という申請が届いています。
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={onReject}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-lg text-sm font-semibold flex justify-center items-center gap-1.5 transition-colors"
          >
            <X size={16} /> 拒否する
          </button>
          <button
            onClick={onApprove}
            className="flex-1 bg-white hover:bg-emerald-50 text-teal-700 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-1.5 shadow-sm transition-colors"
          >
            <Check size={16} /> 同意する
          </button>
        </div>
      </div>
    </section>
  );
}
