/**
 * Supabase へのデータ書き込み（ミューテーション）を担うカスタムフック。
 * UI ロジック・データ取得・派生データ計算とは完全に分離されている。
 */
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, User, ResubmitData } from '@/types';

export function useTransactionMutations(
  transactions: Transaction[],
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  currentUser: User,
) {
  /**
   * 実行中のアクションキーを管理するセット。
   * 同一ボタンの連続タップなど、重複リクエストを防ぐために使用する。
   */
  const inProgressKeysRef = useRef(new Set<string>());

  /**
   * 同一キーのアクションが実行中なら即スキップする（二重実行防止）。
   * Set の add / delete で O(1) に管理できるため、配列ではなく Set を使用している。
   */
  const runOnce = async (key: string, action: () => Promise<void>) => {
    if (inProgressKeysRef.current.has(key)) return;
    inProgressKeysRef.current.add(key);
    try {
      await action();
    } finally {
      inProgressKeysRef.current.delete(key);
    }
  };

  // ---------- 申請の承認 / 差戻し ----------

  const handleResubmit = (id: string, data: ResubmitData) =>
    runOnce(`resubmit-${id}`, async () => {
      // receipt_image_url は任意カラムのため、値がある場合のみペイロードに追加する
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
    runOnce(`approve-${id}`, async () => {
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
    runOnce(`reject-${id}`, async () => {
      // reject_message はオプション項目のため、内容がある場合のみ送信する
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

  // ---------- 削除申請 ----------

  const requestDelete = (id: string) =>
    runOnce(`delete-req-${id}`, async () => {
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
    runOnce(`delete-approve-${id}`, async () => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      alert('データを削除しました');
    }).catch(err => {
      console.error('Error approving delete:', err);
      alert('削除処理に失敗しました');
    });

  const rejectDelete = (id: string) =>
    runOnce(`delete-reject-${id}`, async () => {
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

  /** 差戻し中かつ自分が申請した取引のみ削除（相手の承認不要） */
  const deleteRejectedTransaction = async (id: string): Promise<boolean> => {
    const target = transactions.find(
      t => t.id === id && t.status === 'rejected' && t.paidBy === currentUser,
    );
    if (!target) return false;
    if (!confirm('この差戻しされた申請を削除しますか？取り消せません。')) return false;

    const key = `delete-rejected-${id}`;
    if (inProgressKeysRef.current.has(key)) return false;
    inProgressKeysRef.current.add(key);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting rejected transaction:', err);
      alert('削除に失敗しました');
      return false;
    } finally {
      inProgressKeysRef.current.delete(key);
    }
  };

  // ---------- 精算 ----------

  /**
   * 相手から届いた精算リクエスト対象の ID を取得する共通ヘルパー。
   * approveSettlement / rejectSettlement の両方で同じ絞り込みが必要なため共通化している。
   */
  const getIncomingSettlementIds = (): string[] =>
    transactions
      .filter(
        tx => tx.settlementStatus === 'requested' && tx.settlementRequestedBy !== currentUser,
      )
      .map(tx => tx.id);

  const requestSettlement = () =>
    runOnce('settlement-request', async () => {
      if (
        !confirm(
          '現在の差額を現金等で精算し、アプリの計算をリセット（チャラ）する申請をしますか？',
        )
      )
        return;

      const settleableIds = transactions
        .filter(
          tx =>
            tx.status === 'approved' &&
            tx.settlementStatus === 'none' &&
            tx.deleteStatus !== 'requested',
        )
        .map(tx => tx.id);
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
    runOnce('settlement-approve', async () => {
      const incomingIds = getIncomingSettlementIds();
      if (incomingIds.length === 0) return;

      const { error } = await supabase
        .from('transactions')
        .update({ settlement_status: 'completed' })
        .in('id', incomingIds);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          incomingIds.includes(tx.id) ? { ...tx, settlementStatus: 'completed' } : tx,
        ),
      );
      alert('精算リセットに同意しました。該当の履歴はアーカイブされました。');
    }).catch(err => {
      console.error('Error approving settlement:', err);
      alert('エラーが発生しました');
    });

  const rejectSettlement = () =>
    runOnce('settlement-reject', async () => {
      const incomingIds = getIncomingSettlementIds();
      if (incomingIds.length === 0) return;

      const { error } = await supabase
        .from('transactions')
        .update({ settlement_status: 'none', settlement_requested_by: null })
        .in('id', incomingIds);
      if (error) throw error;
      setTransactions(prev =>
        prev.map(tx =>
          incomingIds.includes(tx.id)
            ? { ...tx, settlementStatus: 'none', settlementRequestedBy: undefined }
            : tx,
        ),
      );
    }).catch(err => {
      console.error('Error rejecting settlement:', err);
      alert('エラーが発生しました');
    });

  return {
    handleResubmit,
    handleApprove,
    handleReject,
    requestDelete,
    approveDelete,
    rejectDelete,
    deleteRejectedTransaction,
    requestSettlement,
    approveSettlement,
    rejectSettlement,
  };
}
