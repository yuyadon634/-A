import React from 'react';
import { ShoppingBag, Receipt, Utensils, Train, HelpCircle } from 'lucide-react';
import { Category } from '@/types';

export const CATEGORIES: { label: Category; icon: React.ReactNode }[] = [
  { label: '食費', icon: React.createElement(ShoppingBag, { size: 16 }) },
  { label: '日用品', icon: React.createElement(Receipt, { size: 16 }) },
  { label: '外食', icon: React.createElement(Utensils, { size: 16 }) },
  { label: '交通費', icon: React.createElement(Train, { size: 16 }) },
  { label: 'その他', icon: React.createElement(HelpCircle, { size: 16 }) },
];
