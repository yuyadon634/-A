import { ReceiptItem } from '@/types';

/**
 * レシートの1行アイテムに対し、相手に請求する金額を算出する。
 * チェック外（selected=false）や精算方法未設定（none）の場合は 0 を返す。
 */
export const getItemRequestedAmount = (item: ReceiptItem): number => {
  if (!item.selected) return 0;
  if (item.splitType === 'none') return 0;
  if (item.splitType === 'split') return Math.floor((Number(item.price) || 0) / 2);
  if (item.splitType === 'full') return Number(item.price) || 0;

  const parsedCustomValue = parseInt(item.customValue) || 0;
  if (item.splitType === 'amount') {
    // 指定金額が商品価格を超えていたら上限を価格にする
    return parsedCustomValue > item.price ? item.price : parsedCustomValue;
  }
  if (item.splitType === 'percentage') {
    return Math.floor((Number(item.price) || 0) * (parsedCustomValue / 100));
  }
  return 0;
};
