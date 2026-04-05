/**
 * 日付に関するユーティリティ（純粋関数・React 非依存）。
 */

/**
 * 指定した日付文字列（YYYY-MM-DD）から今日までの経過日数を返す。
 * 時刻をゼロにして比較することで、同日は 0 日・翌日以降から 1 日以上になる。
 */
export function getDaysElapsed(dateStr: string): number {
  const txDate = new Date(dateStr);
  const today = new Date();
  txDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - txDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * 経過日数に応じたリマインダーバッジの設定を返す。
 *
 * - 3〜6日: 注意（amber）
 * - 7日以上: 警告（red）
 * - 3日未満: null（バッジ非表示）
 */
export function getOverdueBadge(
  daysElapsed: number,
): { label: string; colorClass: string } | null {
  if (daysElapsed >= 7) {
    return {
      label: `${daysElapsed}日 放置中`,
      colorClass: 'bg-red-100 text-red-700 border-red-200',
    };
  }
  if (daysElapsed >= 3) {
    return {
      label: `${daysElapsed}日 経過`,
      colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }
  return null;
}
