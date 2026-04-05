/**
 * アプリのトランザクションデータを一元管理するカスタムフック（オーケストレーター）。
 *
 * 責務：
 *  - transactions / isLoading / fetchError の state 管理
 *  - Supabase からのデータ取得 (fetchTransactions / addTransaction)
 *  - Supabase Realtime によるリアルタイム同期とトースト通知
 *  - transactionSelectors で算出した派生データの公開
 *  - useTransactionMutations で実装した書き込み操作の公開
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, User, BalanceInfo } from '@/types';
import { mapDbRowToTransaction } from '@/lib/db/transactionMapper';
import {
  getPendingTransactions,
  getHistoryTransactions,
  getCompletedTransactions,
  getPendingDeleteTransactions,
  getPendingSettlementRequests,
  getMyPendingTransactions,
  getMyRejectedTransactions,
  getSettleableTransactions,
  getIsWaitingForSettlementApproval,
  // エイリアスが必要な理由: このフックが返す calcBalance 関数と名前が衝突するため
  calcBalance as calcBalanceFn,
} from '@/lib/transactionSelectors';
import { useTransactionMutations } from '@/hooks/useTransactionMutations';
import type { ToastType } from '@/components/ui/Toast';

// ---------- リアルタイム通知 ----------

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

/**
 * Realtime ペイロードを解析し、表示すべき通知メッセージを返す。
 *
 * 自分が起こした操作（自分の申請の INSERT など）は null を返して通知しない。
 * paid_by / settlement_requested_by / delete_requested_by を使って判定するため、
 * Supabase の REPLICA IDENTITY 設定に依存せず new 行だけで判断できる。
 */
function deriveNotification(
  payload: RealtimePayload,
  currentUser: User,
): { message: string; type: ToastType } | null {
  const { eventType, new: newRow } = payload;

  if (eventType === 'INSERT') {
    // 相手が新しい申請を送ってきた（自分の申請は paid_by === currentUser で除外）
    if (newRow.paid_by !== currentUser) {
      return { message: '新しい立替申請が届きました', type: 'info' };
    }
    return null;
  }

  if (eventType === 'UPDATE') {
    // 自分の申請が承認された
    if (newRow.status === 'approved' && newRow.paid_by === currentUser) {
      return { message: '申請が承認されました！', type: 'success' };
    }
    // 自分の申請が差し戻された
    if (newRow.status === 'rejected' && newRow.paid_by === currentUser) {
      return { message: '申請が差し戻されました', type: 'warning' };
    }
    // 相手から精算リクエストが届いた（自分がリクエストした場合は除外）
    if (
      newRow.settlement_status === 'requested' &&
      newRow.settlement_requested_by !== currentUser
    ) {
      return { message: '精算リクエストが届きました', type: 'info' };
    }
    // 自分の精算リクエストが承認された
    if (
      newRow.settlement_status === 'completed' &&
      newRow.settlement_requested_by === currentUser
    ) {
      return { message: '精算リクエストが承認されました！', type: 'success' };
    }
    // 相手から削除リクエストが届いた
    if (
      newRow.delete_status === 'requested' &&
      newRow.delete_requested_by !== currentUser
    ) {
      return { message: '削除リクエストが届きました', type: 'info' };
    }
  }

  return null;
}

// ---------- ローカルヘルパー ----------

/** 日付の降順（新しい順）でトランザクションを並べ替えるヘルパー */
const sortByDateDesc = (list: Transaction[]): Transaction[] =>
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// ---------- フック本体 ----------

export function useTransactions(
  currentUser: User,
  user1Name: string,
  user2Name: string,
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // ---------- データ取得 ----------

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
        setTransactions(data.map(mapDbRowToTransaction));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setFetchError('予期しないエラーが発生しました。再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Realtime イベント用のバックグラウンド再取得。
   * isLoading を操作しないため、画面上にローディングスピナーが出ない。
   */
  const silentFetch = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        setTransactions(data.map(mapDbRowToTransaction));
      }
    } catch {
      // バックグラウンド更新の失敗はサイレントに無視する
    }
  };

  /** 新規申請をサーバー往復なしで即時リストに追加する（楽観的更新） */
  const addTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
  };

  // ---------- Realtime サブスクリプション ----------

  /**
   * silentFetch はレンダリングごとに再生成されるため、
   * Ref に格納して useEffect の依存配列から外す（stale closure を防ぐ）。
   */
  const silentFetchRef = useRef(silentFetch);
  silentFetchRef.current = silentFetch;

  useEffect(() => {
    const channel = supabase
      .channel('realtime-transactions')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: RealtimePayload) => {
          // バックグラウンドでデータを最新化する
          silentFetchRef.current();

          // 相手の操作だった場合のみトースト通知を表示する
          const notification = deriveNotification(payload, currentUser);
          if (notification) setToast(notification);
        },
      )
      .subscribe();

    // コンポーネントのアンマウント時またはユーザー切り替え時にチャンネルを解放する
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const clearToast = () => setToast(null);

  // ---------- ミューテーション ----------

  const mutations = useTransactionMutations(transactions, setTransactions, currentUser);

  // ---------- 派生データ ----------

  // currentUser が '夫' なら user1Name、'妻' なら user2Name に対応
  const currentDisplayName = currentUser === '夫' ? user1Name : user2Name;
  const otherDisplayName = currentUser === '夫' ? user2Name : user1Name;

  const pendingTransactions = getPendingTransactions(transactions, currentUser);
  const historyTransactions = sortByDateDesc(getHistoryTransactions(transactions));
  const completedTransactions = sortByDateDesc(getCompletedTransactions(transactions));
  const pendingDeleteTransactions = getPendingDeleteTransactions(transactions, currentUser);
  const pendingSettlementRequests = getPendingSettlementRequests(transactions, currentUser);
  const myPendingTransactions = sortByDateDesc(getMyPendingTransactions(transactions, currentUser));
  const myRejectedTransactions = sortByDateDesc(getMyRejectedTransactions(transactions, currentUser));
  const settleableTransactions = getSettleableTransactions(transactions);
  const isWaitingForSettlementApproval = getIsWaitingForSettlementApproval(
    transactions,
    currentUser,
  );

  const calcBalance = (): BalanceInfo =>
    calcBalanceFn(transactions, currentUser, currentDisplayName, otherDisplayName);

  return {
    // state
    transactions,
    isLoading,
    fetchError,
    // toast
    toast,
    clearToast,
    // fetch
    fetchTransactions,
    addTransaction,
    // derived
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
    // mutations
    ...mutations,
  };
}
