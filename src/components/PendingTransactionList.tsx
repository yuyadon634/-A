'use client';

import { useState } from 'react';
import { Transaction, User } from '@/types';
import { TransactionCard } from './TransactionCard';
import { RejectCommentModal } from './RejectCommentModal';
import { ReceiptImageModal } from './ReceiptImageModal';

interface PendingTransactionListProps {
  pendingTransactions: Transaction[];
  expandedTxId: string | null;
  onToggleExpand: (id: string) => void;
  getDisplayName: (user: User | undefined) => string;
  onApprove: (id: string) => void;
  onReject: (id: string, message: string) => void;
}

export function PendingTransactionList({
  pendingTransactions,
  expandedTxId,
  onToggleExpand,
  getDisplayName,
  onApprove,
  onReject,
}: PendingTransactionListProps) {
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const handleRejectClick = (id: string) => setRejectTargetId(id);
  const handleRejectConfirm = (comment: string) => {
    if (rejectTargetId) {
      onReject(rejectTargetId, comment);
      setRejectTargetId(null);
    }
  };
  const handleRejectCancel = () => setRejectTargetId(null);

  return (
    <>
      <section>
        <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest px-1">
          あなたへの承認待ち
        </h2>
        <div className="space-y-3">
          {pendingTransactions.length === 0 && (
            <div className="bg-gray-100/50 rounded-xl p-6 text-center text-gray-400 text-sm border border-gray-100 border-dashed">
              現在、承認待ちのデータはありません。
            </div>
          )}
          {pendingTransactions.map(tx => (
            <TransactionCard
              key={tx.id}
              variant="pending"
              tx={tx}
              expandedTxId={expandedTxId}
              onToggleExpand={onToggleExpand}
              getDisplayName={getDisplayName}
              onApprove={onApprove}
              onReject={handleRejectClick}
              onViewReceipt={setReceiptUrl}
            />
          ))}
        </div>
      </section>

      {rejectTargetId && (
        <RejectCommentModal onConfirm={handleRejectConfirm} onCancel={handleRejectCancel} />
      )}
      {receiptUrl && (
        <ReceiptImageModal imageUrl={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </>
  );
}
