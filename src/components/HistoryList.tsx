'use client';

import { useState } from 'react';
import { Transaction, User } from '@/types';
import { TransactionCard } from './TransactionCard';
import { ReceiptImageModal } from './ReceiptImageModal';

interface HistoryListProps {
  historyTransactions: Transaction[];
  currentUser: User;
  expandedTxId: string | null;
  onToggleExpand: (id: string) => void;
  getDisplayName: (user: User | undefined) => string;
  onRequestDelete: (id: string) => void;
}

export function HistoryList({
  historyTransactions,
  currentUser,
  expandedTxId,
  onToggleExpand,
  getDisplayName,
  onRequestDelete,
}: HistoryListProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  return (
    <>
      <section>
        <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest px-1">
          直近の履歴
        </h2>
        <div className="space-y-2">
          {historyTransactions.length === 0 && (
            <p className="text-gray-400 text-sm px-1">未精算の履歴はありません。</p>
          )}
          {historyTransactions.map(tx => (
            <TransactionCard
              key={tx.id}
              variant="history"
              tx={tx}
              currentUser={currentUser}
              expandedTxId={expandedTxId}
              onToggleExpand={onToggleExpand}
              getDisplayName={getDisplayName}
              onRequestDelete={onRequestDelete}
              onViewReceipt={setReceiptUrl}
            />
          ))}
        </div>
      </section>

      {receiptUrl && (
        <ReceiptImageModal imageUrl={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </>
  );
}
