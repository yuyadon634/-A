import React from 'react';
import { ShoppingBag, Receipt, Utensils, Train, HelpCircle } from 'lucide-react';
import { ReceiptItem } from '@/types';

export const getCategoryIcon = (catName: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    '食費': <ShoppingBag size={16} />,
    '日用品': <Receipt size={16} />,
    '外食': <Utensils size={16} />,
    '交通費': <Train size={16} />,
    'その他': <HelpCircle size={16} />,
  };
  return icons[catName] ?? <Receipt size={16} />;
};

export const getItemRequestedAmount = (item: ReceiptItem): number => {
  if (!item.selected) return 0;
  if (item.splitType === 'none') return 0;
  if (item.splitType === 'split') return Math.floor((Number(item.price) || 0) / 2);
  if (item.splitType === 'full') return Number(item.price) || 0;
  const numCustom = parseInt(item.customValue) || 0;
  if (item.splitType === 'amount') return numCustom > item.price ? item.price : numCustom;
  if (item.splitType === 'percentage') return Math.floor((Number(item.price) || 0) * (numCustom / 100));
  return 0;
};
