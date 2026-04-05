'use client';

import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { ReceiptItem, SplitType } from '@/types';
import { getItemRequestedAmount } from '@/lib/transactionUtils';

interface ReceiptItemRowProps {
  item: ReceiptItem;
  onToggleSelection: (id: string) => void;
  onUpdateSplit: (id: string, splitType: SplitType) => void;
  onUpdateCustomValue: (id: string, val: string) => void;
  onUpdateDetail: (id: string, field: 'name' | 'price', val: string) => void;
  onDelete: (id: string) => void;
}

export function ReceiptItemRow({
  item,
  onToggleSelection,
  onUpdateSplit,
  onUpdateCustomValue,
  onUpdateDetail,
  onDelete,
}: ReceiptItemRowProps) {
  return (
    <div
      className={`flex flex-col p-4 transition-colors ${item.selected ? 'bg-white' : 'bg-gray-50/50'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 w-full pr-4">
          <button
            type="button"
            onClick={() => onToggleSelection(item.id)}
            className="text-blue-600 focus:outline-none mt-1 shrink-0"
          >
            {item.selected ? (
              <CheckCircle2 size={24} className="fill-blue-600 text-white" />
            ) : (
              <Circle size={24} className="text-gray-300" />
            )}
          </button>
          <div className="w-full">
            <input
              type="text"
              value={item.name}
              onChange={e => onUpdateDetail(item.id, 'name', e.target.value)}
              placeholder="品名"
              className={`w-full text-sm font-medium bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-0.5
                ${item.selected ? 'text-gray-900' : 'text-gray-400 line-through'}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-bold text-gray-400">¥</span>
          <input
            type="number"
            value={item.price || ''}
            onChange={e => onUpdateDetail(item.id, 'price', e.target.value)}
            placeholder="0"
            className={`w-16 text-right font-bold bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-0.5
              ${item.selected ? 'text-gray-900' : 'text-gray-400'}`}
          />
        </div>
      </div>

      {item.selected && (
        <div className="mt-4 pl-9 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['none', 'split', 'full', 'amount', 'percentage'] as SplitType[]).map(type => {
              const labels: Record<SplitType, string> = {
                none: '未設定',
                split: '割り勘',
                full: '全額',
                amount: '金額',
                percentage: '割合',
              };
              return (
                <button
                  key={type}
                  onClick={() => onUpdateSplit(item.id, type)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    item.splitType === type
                      ? type === 'none'
                        ? 'bg-white text-gray-700 shadow-sm'
                        : 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          {item.splitType !== 'split' && item.splitType !== 'none' && item.splitType !== 'full' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                {item.splitType === 'amount' ? '相手の負担額:' : '相手の負担割合:'}
              </span>
              <input
                type="number"
                value={item.customValue}
                onChange={e => onUpdateCustomValue(item.id, e.target.value)}
                placeholder="0"
                className="w-20 text-sm font-bold border-b-2 border-gray-300 focus:border-blue-600 outline-none text-center pb-0.5 bg-transparent"
              />
              <span className="text-xs font-medium text-gray-600">
                {item.splitType === 'amount' ? '円' : '%'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100/50 pt-2 mt-2">
            <button
              onClick={() => onDelete(item.id)}
              className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1"
            >
              <Trash2 size={12} /> 削除
            </button>
            <span
              className={`text-xs font-bold px-2 py-1 rounded ${
                item.splitType === 'none' ? 'text-gray-500 bg-gray-100' : 'text-blue-600 bg-blue-50'
              }`}
            >
              相手の負担: ¥{getItemRequestedAmount(item).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
