'use client';

import { X, Users } from 'lucide-react';

interface SettingsModalProps {
  tempUser1Name: string;
  tempUser2Name: string;
  onChangeTempUser1Name: (name: string) => void;
  onChangeTempUser2Name: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SettingsModal({
  tempUser1Name,
  tempUser2Name,
  onChangeTempUser1Name,
  onChangeTempUser2Name,
  onSave,
  onClose,
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <header className="flex items-center justify-between p-4 bg-white shadow-sm border-b border-gray-100 relative z-10">
        <h2 className="text-base font-bold text-gray-800 ml-1">設定</h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </header>

      <main className="flex-1 p-5 space-y-6 overflow-y-auto">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-500" /> 表示名の変更
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">
                ユーザー1（内部的には「夫」として保存）
              </label>
              <input
                type="text"
                value={tempUser1Name}
                onChange={e => onChangeTempUser1Name(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all font-medium text-gray-900"
                placeholder="例：たろう"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">
                ユーザー2（内部的には「妻」として保存）
              </label>
              <input
                type="text"
                value={tempUser2Name}
                onChange={e => onChangeTempUser2Name(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all font-medium text-gray-900"
                placeholder="例：はなこ"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-md shadow-blue-600/20 active:bg-blue-700 transition-all"
        >
          設定を保存する
        </button>
      </main>
    </div>
  );
}
