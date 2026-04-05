/**
 * レシート OCR の API クライアント（React 非依存の純粋関数）。
 * /api/ocr への HTTP 通信・レスポンス検証・ReceiptItem への変換を担う。
 */
import { ReceiptItem, SplitType } from '@/types';

/** OCR API レスポンスのアイテムをランタイムで型検証 */
function isOcrItem(v: unknown): v is { name: string; price: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).name === 'string' &&
    typeof (v as Record<string, unknown>).price === 'number'
  );
}

/**
 * レシート画像を OCR API に送信し、ReceiptItem の配列を返す。
 *
 * @throws API エラーやネットワークエラーの場合は Error をスロー
 *         （AbortError は呼び出し元で個別にハンドリングすること）
 */
export async function scanReceiptFile(
  file: File,
  signal?: AbortSignal,
): Promise<ReceiptItem[]> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/ocr', { method: 'POST', body: formData, signal });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ?? 'レシートの読み取りに失敗しました',
    );
  }

  const data: unknown = await res.json();
  const items = (data as { items?: unknown }).items;

  if (!Array.isArray(items)) return [];

  return items.filter(isOcrItem).map(item => ({
    id: crypto.randomUUID(),
    name: item.name || '不明な項目',
    price: item.price || 0,
    selected: true,
    splitType: 'none' as SplitType,
    customValue: '',
  }));
}
