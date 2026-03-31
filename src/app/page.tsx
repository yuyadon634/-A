"use client";

import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { User, Transaction } from '@/types';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { Header } from '@/components/Header';
import { SettlementRequestCard } from '@/components/SettlementRequestCard';
import { PendingTransactionList } from '@/components/PendingTransactionList';
import { PendingDeleteList } from '@/components/PendingDeleteList';
import { HistoryList } from '@/components/HistoryList';
import { CompletedHistory } from '@/components/CompletedHistory';
import { MyRejectedList } from '@/components/MyRejectedList';
import { MyPendingList } from '@/components/MyPendingList';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { SettingsModal } from '@/components/SettingsModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User>('夫');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const settings = useUserSettings();
  const tx = useTransactions(currentUser, settings.user1Name, settings.user2Name);

  useEffect(() => {
    tx.fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDisplayName = settings.getDisplayName(currentUser);
  const otherUser: User = currentUser === '夫' ? '妻' : '夫';
  const otherDisplayName = settings.getDisplayName(otherUser);

  const toggleTxExpand = (id: string) => {
    setExpandedTxId(prev => (prev === id ? null : id));
  };

  const handleSwitchUser = () => {
    setCurrentUser(prev => (prev === '夫' ? '妻' : '夫'));
  };

  const handleOpenSettings = () => setIsSettingsOpen(true);

  const handleCloseSettings = () => {
    settings.cancelSettings();
    setIsSettingsOpen(false);
  };

  const handleSaveSettings = () => {
    settings.saveSettings(() => setIsSettingsOpen(false));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 selection:bg-blue-100 relative">
      {tx.isLoading && tx.transactions.length === 0 && (
        <div className="absolute inset-0 bg-white/80 z-40 flex items-center justify-center backdrop-blur-sm">
          <Loader2 size={40} className="text-blue-600 animate-spin" />
        </div>
      )}

      <Header
        currentDisplayName={currentDisplayName}
        balanceInfo={tx.calcBalance()}
        settleableCount={tx.settleableTransactions.length}
        isWaitingForSettlementApproval={tx.isWaitingForSettlementApproval}
        onSwitchUser={handleSwitchUser}
        onOpenSettings={handleOpenSettings}
        onRequestSettlement={tx.requestSettlement}
      />

      <main className="px-5 pt-6 space-y-8 max-w-lg mx-auto">
        {tx.fetchError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="flex-1 text-sm text-red-700">{tx.fetchError}</p>
            <button
              onClick={() => tx.fetchTransactions()}
              className="flex items-center gap-1 text-xs font-bold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
            >
              <RefreshCw size={12} />
              再試行
            </button>
          </div>
        )}

        <SettlementRequestCard
          pendingSettlementRequests={tx.pendingSettlementRequests}
          getDisplayName={settings.getDisplayName}
          onApprove={tx.approveSettlement}
          onReject={tx.rejectSettlement}
        />

        <PendingTransactionList
          pendingTransactions={tx.pendingTransactions}
          expandedTxId={expandedTxId}
          onToggleExpand={toggleTxExpand}
          getDisplayName={settings.getDisplayName}
          onApprove={tx.handleApprove}
          onReject={(id, message) => tx.handleReject(id, message)}
        />

        <MyPendingList myPendingTransactions={tx.myPendingTransactions} />

        <MyRejectedList
          myRejectedTransactions={tx.myRejectedTransactions}
          currentUser={currentUser}
          onEdit={setEditingTransaction}
        />

        <PendingDeleteList
          pendingDeleteTransactions={tx.pendingDeleteTransactions}
          getDisplayName={settings.getDisplayName}
          onApproveDelete={tx.approveDelete}
          onRejectDelete={tx.rejectDelete}
        />

        <HistoryList
          historyTransactions={tx.historyTransactions}
          currentUser={currentUser}
          expandedTxId={expandedTxId}
          onToggleExpand={toggleTxExpand}
          getDisplayName={settings.getDisplayName}
          onRequestDelete={tx.requestDelete}
        />

        <CompletedHistory
          completedTransactions={tx.completedTransactions}
          getDisplayName={settings.getDisplayName}
        />
      </main>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform active:scale-95 z-20"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {isModalOpen && (
        <AddTransactionModal
          currentUser={currentUser}
          otherDisplayName={otherDisplayName}
          onSuccess={tx.addTransaction}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {editingTransaction && (
        <AddTransactionModal
          currentUser={currentUser}
          otherDisplayName={otherDisplayName}
          editTransaction={editingTransaction}
          onResubmit={tx.handleResubmit}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          tempUser1Name={settings.tempUser1Name}
          tempUser2Name={settings.tempUser2Name}
          onChangeTempUser1Name={settings.setTempUser1Name}
          onChangeTempUser2Name={settings.setTempUser2Name}
          onSave={handleSaveSettings}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
