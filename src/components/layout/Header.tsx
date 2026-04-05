'use client';

import { Users, ArrowRight, CheckCircle2, Settings } from 'lucide-react';
import { BalanceInfo } from '@/types';

interface HeaderProps {
  currentDisplayName: string;
  balanceInfo: BalanceInfo;
  settleableCount: number;
  isWaitingForSettlementApproval: boolean;
  onOpenSettings: () => void;
  onRequestSettlement: () => void;
}

export function Header({
  currentDisplayName,
  balanceInfo,
  settleableCount,
  isWaitingForSettlementApproval,
  onOpenSettings,
  onRequestSettlement,
}: HeaderProps) {
  return (
    <header className="bg-white px-5 py-4 shadow-sm sticky top-0 z-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          精算アプリ
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
            aria-label="設定"
          >
            <Settings size={18} />
          </button>
        </h1>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium select-none">
          <Users size={16} className="text-gray-500" />
          現在: <span className="text-blue-600 font-bold">{currentDisplayName}</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
        <p className="text-blue-100 text-sm font-medium mb-1">次回の精算見込み</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">¥{balanceInfo.amount.toLocaleString()}</span>
        </div>
        {balanceInfo.from ? (
          <div className="mt-3 flex items-center gap-2 text-sm bg-white/20 px-3 py-1.5 rounded-lg w-fit">
            <span className="font-semibold">{balanceInfo.from}</span>
            <ArrowRight size={14} className="opacity-80" />
            <span className="font-semibold">{balanceInfo.to}</span>
            <span className="opacity-90 ml-1">支払う予定</span>
          </div>
        ) : (
          <div className="mt-3 text-sm bg-white/20 px-3 py-1.5 rounded-lg w-fit">
            {balanceInfo.text}
          </div>
        )}

        {settleableCount > 0 && !isWaitingForSettlementApproval && (
          <button
            onClick={onRequestSettlement}
            className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 size={16} /> 精算済みにする（リセット申請）
          </button>
        )}
        {isWaitingForSettlementApproval && (
          <div className="mt-4 w-full bg-white/10 text-white/90 py-2.5 rounded-xl text-sm font-bold text-center border border-white/20 border-dashed">
            相手の精算リセット同意待ち...
          </div>
        )}
      </div>
    </header>
  );
}
