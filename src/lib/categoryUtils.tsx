'use client';

import { ShoppingBag, Receipt, Utensils, Train, HelpCircle } from 'lucide-react';

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
