import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, User, SplitType, Status, ReceiptItem } from '@/types';

export type ResubmitData = {
  amount: number;
  category: string;
  splitType: SplitType;
  requestedAmount: number;
  receiptItems: ReceiptItem[];
  receiptImageUrl?: string;
  message: string;
};

export type BalanceInfo =
  | { text: string; amount: 0; from: null; to: null }
  | { amount: number; from: string; to: string; text?: undefined };

// --- ランタイム型ガード ---
// DB から返る値が想定外の場合に console.warn でログを残し、安全なフォールバックを返す

function assertUser(v: unknown, field: string): User {
  if (v === '夫' || v === '妻') return v;
  console.warn(`[DB] Unexpected ${field}: ${String(v)}`);
  return '夫';
}

function assertStatus(v: unknown): Status {
  if (v === 'pending' || v === 'approved' || v === 'rejected') return v;
  console.warn(`[DB] Unexpected status: ${String(v)}`);
  return 'pending';
}

function assertSplitType(v: unknown): SplitType {
  if (['none', 'split', 'full', 'amount', 'percentage'].includes(v as string))
    return v as SplitType;
  console.warn(`[DB] Unexpected splitType: ${String(v)}`);
  return 'none';
}

function assertDeleteStatus(v: unknown): 'none' | 'requested' {
  if (v === 'none' || v === 'requested') return v;
  return 'none';
}

function assertSettlementStatus(v: unknown): 'none' | 'requested' | 'completed' {
  if (v === 'none' || v === 'requested' || v === 'completed') return v;
  return 'none';
}

export function useTransactions(
  currentUser: User,
  user1Name: string,
  user2Name: string,
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ① 二重実行防止: 処理中のアクションキーを追跡
  const processingIdsRef = useRef(new Set<string>());

  /**
   * 同一キーのアクションが既に実行中なら即座にスキップ。
   * これにより連続タップ・ダブルタップによる重複リクエストを防ぐ。
   */
  const withDedup = async (key: string, action: () => Promise<void>) => {
    if (processingIdsRef.current.has(key)) return;
    processingIdsRef.current.add(key);
    try {
      await action();
    } finally {
      processingIdsRef.current.delete(key);
    }
  };

  const fetchTransactions = async () => {
    setFetchError(null);
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        setFetchError('データの読み込みに失敗しました。再試行してください。');
        return;
      }

      if (data) {
        // ② DB の値を型ガードで安全にマッピング
        const formattedData: Transaction[] = data.map(item => ({
          id: item.id.toString(),
          date: item.date,
          amount: item.amount,
          paidBy: assertUser(item.paid_by, 'paidBy'),
          requestedAmount: item.requested_amount,
          splitType: assertSplitType(item.split_type),
          status: assertStatus(item.status),
          category: typeof item.category === 'string' ? item.category : '',
          deleteStatus: assertDeleteStatus(item.delete_status),
          deleteRequestedBy: item.delete_requested_by != null
            ? assertUser(item.delete_requested_by, 'deleteRequestedBy')
            : undefined,
          settlementStatus: assertSettlementStatus(item.settlement_status),
          settlementRequestedBy: item.settlement_requested_by != null
            ? assertUser(item.settlement_requested_by, 'settlementRequestedBy')
            : undefined,
          receiptItems: Array.isArray(item.receipt_items) ? item.receipt_items : [],
          receiptImageUrl: item.receipt_image_url || undefined,
          message: item.message || undefined,
          rejectMessage: item.reject_message || undefined,
        }));
        setTransactions(formattedData);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setFetchError('予期しないエラーが発生しました。再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Computed values ---

  const pendingTransactions = transactions.filter(
    tx => tx.status === 'pending' && tx.paidBy !== currentUser,
  );

  const historyTransactions = transactions
    .filter(
      tx =>
        tx.status === 'approved' &&
        tx.deleteStatus !== 'requested' &&
        tx.settlementStatus !== 'completed',
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const completedTransactions = transactions
    .filter(tx => tx.settlementStatus === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingDeleteTransactions = transactions.filter(
    tx => tx.deleteStatus === 'requested' && tx.deleteRequestedBy !== currentUser,
  );

  const pendingSettlementRequests = transactions.filter(
    tx => tx.settlementStatus === 'requested' && tx.settlementRequestedBy !== currentUser,
  );

  const myPendingTransactions = transactions
    .filter(tx => tx.status === 'pending' && tx.paidBy === currentUser)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const myRejectedTransactions = transactions
    .filter(tx => tx.status === 'rejected' && tx.paidBy === currentUser)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const settleableTransactions = transactions.filter(
    tx =>
      tx.status === 'approved' &&
      tx.settlementStatus === 'none' &&
      tx.deleteStatus !== 'requested',
  );

  const isWaitingForSettlementApproval = transactions.some(
    tx => tx.settlementStatus === 'requested' && tx.settlementRequestedBy === currentUser,
  );

  const calcBalance = (): BalanceInfo => {
    let balance = 0;
    transactions.forEach(tx => {
      if (tx.status !== 'approved') return;
      if (tx.deleteStatus === 'requested') return;
      if (tx.settlementStatus !== 'none') return;
      if (tx.paidBy === '夫') balance += tx.requestedAmount;
      else balance -= tx.requestedAmount;
    });

    if (balance === 0) return { text: '精算なし（0円）', amount: 0, from: null, to: null };
    if (balance > 0) return { amount: balance, from: user2Name, to: user1Name };
    return { amount: Math.abs(balance), from: user1Name, to: user2Name };
  };

  // --- Actions (全て withDedup でラップ) ---

  const addTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
  };

  const handleResubmit = (id: string, data: ResubmitData) =>
    withDedup(`resubmit-${id}`, async () => {
      // null 値のオプションカラムは含めない（DBにカラムがない場合でも動くよう防衛的に構築）
      const updatePayload: Record<string, unknown> = {
        amount: data.amount,
        category: data.category,
        split_type: data.splitType,
        requested_amount: data.requestedAmount,
        receipt_items: data.receiptItems,
        message: data.message || null,
        status: 'pending',
      };
      if (data.receiptImageUrl) updatePayload.receipt_image_url = data.receiptImageUrl;

      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id
            ? {
                ...tx,
                amount: data.amount,
                category: data.category,
                splitType: data.splitType,
                requestedAmount: data.requestedAmount,
                  receiptItems: data.receiptItems,
                  receiptImageUrl: data.receiptImageUrl || undefined,
                  message: data.message || undefined,
                  status: 'pending',
                  rejectMessage: undefined,
              }
            : tx,
        ),
      );
    }).catch(err => {
      console.error('Error resubmitting transaction:', err);
      alert('再申請に失敗しました');
    });

  const handleApprove = (id: string) =>
    withDedup(`approve-${id}`, async () => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx => (tx.id === id ? { ...tx, status: 'approved' } : tx)),
      );
    }).catch(err => {
      console.error('Error approving transaction:', err);
      alert('承認処理に失敗しました');
    });

  const handleReject = (id: string, rejectMessage: string) =>
    withDedup(`reject-${id}`, async () => {
      // reject_message カラムが存在しない場合でも status 更新だけは成功するよう分離
      const rejectPayload: Record<string, unknown> = { status: 'rejected' };
      if (rejectMessage) rejectPayload.reject_message = rejectMessage;

      const { error } = await supabase
        .from('transactions')
        .update(rejectPayload)
        .eq('id', id);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id
            ? { ...tx, status: 'rejected', rejectMessage: rejectMessage || undefined }
            : tx,
        ),
      );
    }).catch(err => {
      console.error('Error rejecting transaction:', err);
      alert('差戻し処理に失敗しました');
    });

  const requestDelete = (id: string) =>
    withDedup(`delete-req-${id}`, async () => {
      if (!confirm('このデータを削除申請しますか？（相手が同意すると完全に削除されます）')) return;
      const { error } = await supabase
        .from('transactions')
        .update({ delete_status: 'requested', delete_requested_by: currentUser })
        .eq('id', id);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id
            ? { ...tx, deleteStatus: 'requested', deleteRequestedBy: currentUser }
            : tx,
        ),
      );
      alert('削除を申請しました。相手の同意を待ちます。');
    }).catch(err => {
      console.error('Error requesting delete:', err);
      alert('削除申請に失敗しました');
    });

  const approveDelete = (id: string) =>
    withDedup(`delete-approve-${id}`, async () => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      alert('データを削除しました');
    }).catch(err => {
      console.error('Error approving delete:', err);
      alert('削除処理に失敗しました');
    });

  const rejectDelete = (id: string) =>
    withDedup(`delete-reject-${id}`, async () => {
      const { error } = await supabase
        .from('transactions')
        .update({ delete_status: 'none', delete_requested_by: null })
        .eq('id', id);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id ? { ...tx, deleteStatus: 'none', deleteRequestedBy: undefined } : tx,
        ),
      );
    }).catch(err => {
      console.error('Error rejecting delete:', err);
      alert('拒否処理に失敗しました');
    });

  const requestSettlement = () =>
    withDedup('settlement-request', async () => {
      if (
        !confirm(
          '現在の差額を現金等で精算し、アプリの計算をリセット（チャラ）する申請をしますか？',
        )
      )
        return;
      const settleableIds = settleableTransactions.map(tx => tx.id);
      if (settleableIds.length === 0) return;
      const { error } = await supabase
        .from('transactions')
        .update({ settlement_status: 'requested', settlement_requested_by: currentUser })
        .in('id', settleableIds);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          settleableIds.includes(tx.id)
            ? { ...tx, settlementStatus: 'requested', settlementRequestedBy: currentUser }
            : tx,
        ),
      );
      alert('精算リセットを申請しました。相手の同意を待ちます。');
    }).catch(err => {
      console.error('Error requesting settlement:', err);
      alert('申請に失敗しました');
    });

  const approveSettlement = () =>
    withDedup('settlement-approve', async () => {
      const requestedIds = pendingSettlementRequests.map(tx => tx.id);
      if (requestedIds.length === 0) return;
      const { error } = await supabase
        .from('transactions')
        .update({ settlement_status: 'completed' })
        .in('id', requestedIds);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          requestedIds.includes(tx.id) ? { ...tx, settlementStatus: 'completed' } : tx,
        ),
      );
      alert('精算リセットに同意しました。該当の履歴はアーカイブされました。');
    }).catch(err => {
      console.error('Error approving settlement:', err);
      alert('エラーが発生しました');
    });

  const rejectSettlement = () =>
    withDedup('settlement-reject', async () => {
      const requestedIds = pendingSettlementRequests.map(tx => tx.id);
      if (requestedIds.length === 0) return;
      const { error } = await supabase
        .from('transactions')
        .update({ settlement_status: 'none', settlement_requested_by: null })
        .in('id', requestedIds);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          requestedIds.includes(tx.id)
            ? { ...tx, settlementStatus: 'none', settlementRequestedBy: undefined }
            : tx,
        ),
      );
    }).catch(err => {
      console.error('Error rejecting settlement:', err);
      alert('エラーが発生しました');
    });

  return {
    transactions,
    isLoading,
    fetchError,
    fetchTransactions,
    addTransaction,
    handleResubmit,
    pendingTransactions,
    myPendingTransactions,
    historyTransactions,
    completedTransactions,
    pendingDeleteTransactions,
    pendingSettlementRequests,
    myRejectedTransactions,
    settleableTransactions,
    isWaitingForSettlementApproval,
    calcBalance,
    handleApprove,
    handleReject,
    requestDelete,
    approveDelete,
    rejectDelete,
    requestSettlement,
    approveSettlement,
    rejectSettlement,
  };
}
