import React from 'react';
import { ShoppingBag, Receipt, Utensils, Train, HelpCircle } from 'lucide-react';

export type User = '夫' | '妻';
export type SplitType = 'none' | 'split' | 'full' | 'amount' | 'percentage';
export type Status = 'pending' | 'approved' | 'rejected';
export type Category = '食費' | '日用品' | '外食' | '交通費' | 'その他';

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  paidBy: User;
  requestedAmount: number;
  splitType: SplitType;
  status: Status;
  category: string;
  deleteStatus?: 'none' | 'requested';
  deleteRequestedBy?: User;
  settlementStatus?: 'none' | 'requested' | 'completed';
  settlementRequestedBy?: User;
  receiptItems?: ReceiptItem[];
  receiptImageUrl?: string;
  message?: string;
  rejectMessage?: string;
};

export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  selected: boolean;
  splitType: SplitType;
  customValue: string;
};

export const CATEGORIES: { label: Category; icon: React.ReactNode }[] = [
  { label: '食費', icon: React.createElement(ShoppingBag, { size: 16 }) },
  { label: '日用品', icon: React.createElement(Receipt, { size: 16 }) },
  { label: '外食', icon: React.createElement(Utensils, { size: 16 }) },
  { label: '交通費', icon: React.createElement(Train, { size: 16 }) },
  { label: 'その他', icon: React.createElement(HelpCircle, { size: 16 }) },
];
