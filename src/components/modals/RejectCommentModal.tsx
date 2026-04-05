'use client';

import { useState } from 'react';
import { X, CornerDownLeft } from 'lucide-react';

interface RejectCommentModalProps {
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export function RejectCommentModal({ onConfirm, onCancel }: RejectCommentModalProps) {
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-safe animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">差戻しコメント</h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
            aria-label="キャンセル"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          差戻し理由を相手に伝えることができます（任意）。
        </p>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="例：金額が違う気がする、領収書を見せて！など"
          rows={3}
          autoFocus
          className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-orange-400 focus:border-orange-400 block p-4 outline-none resize-none transition-all placeholder:text-gray-400"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(comment)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <CornerDownLeft size={16} /> 差戻しを確定
          </button>
        </div>
      </div>
    </div>
  );
}
