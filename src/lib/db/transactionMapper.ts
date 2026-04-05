/**
 * DB 行 → アプリ型 のマッピングと、それを支える型ガード群。
 * Supabase に依存するため DB 層として lib/db/ に配置する。
 */
import { Transaction, User, Status, SplitType, ReceiptItem } from '@/types';

// ---------- 型ガード（不正値は console.warn でログを残しフォールバック） ----------

export function assertUser(v: unknown, field = 'user'): User {
  if (v === '夫' || v === '妻') return v;
  console.warn(`[DB] Unexpected ${field}: ${String(v)}`);
  return '夫';
}

export function assertStatus(v: unknown): Status {
  if (v === 'pending' || v === 'approved' || v === 'rejected') return v;
  console.warn(`[DB] Unexpected status: ${String(v)}`);
  return 'pending';
}

export function assertSplitType(v: unknown): SplitType {
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

// ---------- マッピング ----------

/**
 * Supabase から返ってくる生の行オブジェクトを、型安全な Transaction に変換する。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbRowToTransaction(row: any): Transaction {
  return {
    id: row.id.toString(),
    date: row.date,
    amount: row.amount,
    paidBy: assertUser(row.paid_by, 'paidBy'),
    requestedAmount: row.requested_amount,
    splitType: assertSplitType(row.split_type),
    status: assertStatus(row.status),
    category: typeof row.category === 'string' ? row.category : '',
    deleteStatus: assertDeleteStatus(row.delete_status),
    deleteRequestedBy:
      row.delete_requested_by != null
        ? assertUser(row.delete_requested_by, 'deleteRequestedBy')
        : undefined,
    settlementStatus: assertSettlementStatus(row.settlement_status),
    settlementRequestedBy:
      row.settlement_requested_by != null
        ? assertUser(row.settlement_requested_by, 'settlementRequestedBy')
        : undefined,
    receiptItems: Array.isArray(row.receipt_items)
      ? (row.receipt_items as ReceiptItem[])
      : [],
    receiptImageUrl: row.receipt_image_url || undefined,
    message: row.message || undefined,
    rejectMessage: row.reject_message || undefined,
  };
}
