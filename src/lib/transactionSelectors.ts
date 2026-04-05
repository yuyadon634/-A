/**
 * Transaction[] から UI が必要とする各種派生データを算出する純粋関数群。
 * フックやコンポーネントに依存しないため、単体テストが容易。
 */
import { Transaction, User, BalanceInfo } from '@/types';

// ---------- リスト絞り込み ----------

/** 相手が立替えた、自分の承認待ちトランザクション */
export function getPendingTransactions(
  transactions: Transaction[],
  currentUser: User,
): Transaction[] {
  return transactions.filter(
    t =>
      t.status === 'pending' &&
      t.paidBy !== currentUser &&
      t.deleteStatus !== 'requested',
  );
}

/** 承認済みで削除リクエストなし（履歴表示用） */
export function getHistoryTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(
    t =>
      t.status === 'approved' &&
      t.deleteStatus !== 'requested' &&
      t.settlementStatus !== 'completed',
  );
}

/** 精算完了済みトランザクション */
export function getCompletedTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(t => t.settlementStatus === 'completed');
}

/** 削除リクエスト中のトランザクション（相手が依頼したもの）*/
export function getPendingDeleteTransactions(
  transactions: Transaction[],
  currentUser: User,
): Transaction[] {
  return transactions.filter(
    t => t.deleteStatus === 'requested' && t.deleteRequestedBy !== currentUser,
  );
}

/** 精算リクエスト中のトランザクション（自分が受け取り側）*/
export function getPendingSettlementRequests(
  transactions: Transaction[],
  currentUser: User,
): Transaction[] {
  return transactions.filter(
    t =>
      t.settlementStatus === 'requested' &&
      t.settlementRequestedBy !== currentUser,
  );
}

/** 自分が申請した、相手の承認待ちトランザクション */
export function getMyPendingTransactions(
  transactions: Transaction[],
  currentUser: User,
): Transaction[] {
  return transactions.filter(
    t => t.status === 'pending' && t.paidBy === currentUser,
  );
}

/** 自分が申請して差し戻されたトランザクション */
export function getMyRejectedTransactions(
  transactions: Transaction[],
  currentUser: User,
): Transaction[] {
  return transactions.filter(
    t => t.status === 'rejected' && t.paidBy === currentUser,
  );
}

/** 精算可能なトランザクション（承認済み・削除なし・精算前） */
export function getSettleableTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(
    t =>
      t.status === 'approved' &&
      t.deleteStatus !== 'requested' &&
      t.settlementStatus === 'none',
  );
}

/** 自分が精算リクエストを送信済みかどうか */
export function getIsWaitingForSettlementApproval(
  transactions: Transaction[],
  currentUser: User,
): boolean {
  return transactions.some(
    t =>
      t.settlementStatus === 'requested' &&
      t.settlementRequestedBy === currentUser,
  );
}

// ---------- 残高計算 ----------

/**
 * 承認済み・精算未完了のトランザクションから、現在ユーザー視点の差引残高を計算する。
 *
 * 符号の定義:
 *   正値（+） → 自分が立替えた分が相手の支払額を上回っている → 相手から受け取れる
 *   負値（-） → 相手が立替えた分が上回っている             → 自分が相手に支払う
 */
export function calcBalance(
  transactions: Transaction[],
  currentUser: User,
  currentDisplayName: string,
  otherDisplayName: string,
): BalanceInfo {
  // 精算対象外（未承認・削除申請中・精算済み）のトランザクションは除外する
  let netAmountOwedToCurrentUser = 0;
  for (const t of transactions) {
    if (t.status !== 'approved') continue;
    if (t.deleteStatus === 'requested') continue;
    if (t.settlementStatus !== 'none') continue;
    if (t.paidBy === currentUser) {
      netAmountOwedToCurrentUser += t.requestedAmount;
    } else {
      netAmountOwedToCurrentUser -= t.requestedAmount;
    }
  }

  if (netAmountOwedToCurrentUser === 0) {
    return { text: '精算なし（0円）', amount: 0, from: null, to: null };
  }

  if (netAmountOwedToCurrentUser > 0) {
    return { amount: netAmountOwedToCurrentUser, from: otherDisplayName, to: currentDisplayName };
  }

  return { amount: -netAmountOwedToCurrentUser, from: currentDisplayName, to: otherDisplayName };
}
