"use client";

import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { User, Transaction } from '@/types';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { Header } from '@/components/layout/Header';
import { SettlementRequestCard } from '@/components/settlement/SettlementRequestCard';
import { PendingTransactionList } from '@/components/transaction/PendingTransactionList';
import { PendingDeleteList } from '@/components/transaction/PendingDeleteList';
import { HistoryList } from '@/components/transaction/HistoryList';
import { CompletedHistory } from '@/components/transaction/CompletedHistory';
import { MyRejectedList } from '@/components/transaction/MyRejectedList';
import { MyPendingList } from '@/components/transaction/MyPendingList';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { UserSelectScreen } from '@/components/screens/UserSelectScreen';
import { Toast } from '@/components/ui/Toast';
import { useBadge } from '@/hooks/useBadge';

const STORAGE_KEY_USER = 'selectedUser';

export default function Home() {
  // null = マウント前（サーバー・クライアント両方でnullに揃えてHydrationを回避）
  const [isUserSelected, setIsUserSelected] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User>('夫');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const settings = useUserSettings();
  const tx = useTransactions(currentUser, settings.user1Name, settings.user2Name);

  // 承認待ち・精算リクエスト・削除リクエストのいずれかがあればアイコンにバッジを表示する
  // isUserSelected が true のときのみカウントし、未ログイン時はバッジをクリアする
  const hasPendingItems =
    isUserSelected === true &&
    (tx.pendingTransactions.length > 0 ||
      tx.pendingSettlementRequests.length > 0 ||
      tx.pendingDeleteTransactions.length > 0);
  useBadge(hasPendingItems);

  useEffect(() => {
    // マウント後にlocalStorageを読み込む（SSRと一致させるためuseEffect内で行う）
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved === '夫' || saved === '妻') {
      setCurrentUser(saved);
      setIsUserSelected(true);
    } else {
      setIsUserSelected(false);
    }
  }, []);

  useEffect(() => {
    if (isUserSelected) tx.fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserSelected]);

  const currentDisplayName = settings.getDisplayName(currentUser);
  const otherUser: User = currentUser === '夫' ? '妻' : '夫';
  const otherDisplayName = settings.getDisplayName(otherUser);

  const toggleTxExpand = (id: string) => {
    setExpandedTxId(prev => (prev === id ? null : id));
  };

  const handleSelectUser = (user: User) => {
    localStorage.setItem(STORAGE_KEY_USER, user);
    setCurrentUser(user);
    setIsUserSelected(true);
  };

  const handleChangeUser = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setIsUserSelected(false);
    setIsSettingsOpen(false);
  };

  const handleOpenSettings = () => setIsSettingsOpen(true);

  const handleCloseSettings = () => {
    settings.cancelSettings();
    setIsSettingsOpen(false);
  };

  const handleSaveSettings = () => {
    settings.saveSettings(() => setIsSettingsOpen(false));
  };

  // マウント前はサーバーと同じ空描画にしてHydrationを回避
  if (isUserSelected === null) return null;

  if (!isUserSelected) {
    return (
      <UserSelectScreen
        user1Name={settings.user1Name}
        user2Name={settings.user2Name}
        onSelect={handleSelectUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 selection:bg-blue-100 relative">
      {tx.toast && (
        <Toast
          message={tx.toast.message}
          type={tx.toast.type}
          onClose={tx.clearToast}
        />
      )}
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

        <MyPendingList
          myPendingTransactions={tx.myPendingTransactions}
          onWithdraw={tx.withdrawPendingTransaction}
        />

        <MyRejectedList
          myRejectedTransactions={tx.myRejectedTransactions}
          currentUser={currentUser}
          onEdit={setEditingTransaction}
          onDelete={async id => {
            const ok = await tx.deleteRejectedTransaction(id);
            if (ok && editingTransaction?.id === id) setEditingTransaction(null);
          }}
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
          onChangeUser={handleChangeUser}
        />
      )}
    </div>
  );
}
