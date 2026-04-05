/**
 * レシート明細アイテムの state と CRUD 操作を管理するカスタムフック。
 * OCR スキャン結果・手動追加アイテムの両方を対象とする。
 *
 * アイテムの合計金額が変わる操作（価格編集・削除・初回手動追加）では
 * onAmountChange コールバックを通じて親フォームの金額フィールドを同期する。
 */
import { useState } from 'react';
import { ReceiptItem, SplitType } from '@/types';

export function useReceiptItems(
  initialItems: ReceiptItem[] | null,
  /** アイテムの合計金額が変わったときに親フォームへ通知するコールバック */
  onAmountChange: (newTotal: string) => void,
) {
  const [scannedItems, setScannedItems] = useState<ReceiptItem[] | null>(initialItems);

  const toggleItemSelection = (id: string) => {
    setScannedItems(prev =>
      prev
        ? prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
        : null,
    );
  };

  const updateItemSplit = (id: string, newSplitType: SplitType) => {
    setScannedItems(prev =>
      prev
        ? prev.map(item => (item.id === id ? { ...item, splitType: newSplitType } : item))
        : null,
    );
  };

  const updateItemCustomValue = (id: string, value: string) => {
    setScannedItems(prev =>
      prev
        ? prev.map(item => (item.id === id ? { ...item, customValue: value } : item))
        : null,
    );
  };

  const updateItemDetail = (id: string, field: 'name' | 'price', value: string) => {
    setScannedItems(prev => {
      if (!prev) return null;
      const updatedItems = prev.map(item => {
        if (item.id !== id) return item;
        return { ...item, [field]: field === 'price' ? (parseInt(value, 10) || 0) : value };
      });
      // 価格が変わったとき、アイテム合計を親フォームの金額欄に即時反映する
      if (field === 'price') {
        const newTotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
        onAmountChange(newTotal.toString());
      }
      return updatedItems;
    });
  };

  /** チェック済み（selected=true）の全アイテムに一括で精算方法を適用する */
  const bulkUpdateSplit = (splitTypeToApply: SplitType, customValue: string = '') => {
    setScannedItems(prev =>
      prev
        ? prev.map(item =>
            item.selected
              ? {
                  ...item,
                  splitType: splitTypeToApply,
                  // amount / percentage 以外は customValue を持たないためクリアする
                  customValue:
                    splitTypeToApply === 'amount' || splitTypeToApply === 'percentage'
                      ? customValue
                      : '',
                }
              : item,
          )
        : null,
    );
  };

  const addManualItem = () => {
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      selected: true,
      splitType: 'none',
      customValue: '',
    };
    setScannedItems(prev => {
      if (!prev) {
        // 初めて手動アイテムを追加する際、明細モードに切り替わるタイミングで
        // 金額欄を '0' に初期化し、送信ボタンが有効になる条件を満たす
        onAmountChange('0');
        return [newItem];
      }
      return [...prev, newItem];
    });
  };

  const deleteItem = (id: string) => {
    setScannedItems(prev => {
      if (!prev) return null;
      const remainingItems = prev.filter(item => item.id !== id);
      // 削除後の合計を親フォームに反映する
      const newTotal = remainingItems.reduce((sum, item) => sum + item.price, 0);
      onAmountChange(newTotal.toString());
      return remainingItems;
    });
  };

  return {
    scannedItems,
    setScannedItems,
    toggleItemSelection,
    updateItemSplit,
    updateItemCustomValue,
    updateItemDetail,
    bulkUpdateSplit,
    addManualItem,
    deleteItem,
  };
}
