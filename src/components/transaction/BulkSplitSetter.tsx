'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';
import { SplitType } from '@/types';

interface BulkSplitSetterProps {
  onApply: (splitType: SplitType, customValue: string) => void;
}

export function BulkSplitSetter({ onApply }: BulkSplitSetterProps) {
  const [bulkType, setBulkType] = useState<Exclude<SplitType, 'none'> | null>(null);
  const [bulkCustom, setBulkCustom] = useState('');

  const handleSelectType = (type: Exclude<SplitType, 'none'>) => {
    const next = bulkType === type ? null : type;
    setBulkType(next);
    setBulkCustom('');
    if (next === 'split' || next === 'full') {
      onApply(next, '');
    }
  };

  const handleApplyCustom = () => {
    if (!bulkType) return;
    onApply(bulkType, bulkCustom);
  };

  const labels: Record<Exclude<SplitType, 'none'>, string> = {
    split: '割り勘',
    full: '全額',
    amount: '金額',
    percentage: '割合',
  };

  return (
    <div className="p-3 bg-amber-50 border-b border-amber-100 space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers size={13} className="text-amber-600" />
        <p className="text-xs font-bold text-amber-700">一括設定（チェック中の項目に適用）</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {(['split', 'full', 'amount', 'percentage'] as const).map(type => (
          <button
            key={type}
            onClick={() => handleSelectType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              bulkType === type
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-400 hover:text-amber-700'
            }`}
          >
            {labels[type]}
          </button>
        ))}
      </div>

      {(bulkType === 'amount' || bulkType === 'percentage') && (
        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
          <span className="text-xs text-gray-600 font-medium">
            {bulkType === 'amount' ? '負担額:' : '負担割合:'}
          </span>
          <input
            type="number"
            value={bulkCustom}
            onChange={e => setBulkCustom(e.target.value)}
            placeholder="0"
            className="w-20 text-xs font-bold border border-gray-300 focus:border-amber-500 rounded-lg px-2 py-1.5 outline-none text-center bg-white"
          />
          <span className="text-xs text-gray-500">{bulkType === 'amount' ? '円' : '%'}</span>
          <button
            onClick={handleApplyCustom}
            disabled={!bulkCustom}
            className="px-3 py-1.5 bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-xs font-bold transition-colors"
          >
            適用
          </button>
        </div>
      )}
    </div>
  );
}
