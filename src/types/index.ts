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

export type ResubmitData = {
  amount: number;
  category: string;
  splitType: SplitType;
  requestedAmount: number;
  receiptItems: ReceiptItem[];
  receiptImageUrl?: string;
  message: string;
};

export type BalanceInfo =
  | { text: string; amount: 0; from: null; to: null }
  | { amount: number; from: string; to: string; text?: undefined };
