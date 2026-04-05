'use client';

import { User } from '@/types';

interface UserSelectScreenProps {
  user1Name: string;
  user2Name: string;
  onSelect: (user: User) => void;
}

export function UserSelectScreen({ user1Name, user2Name, onSelect }: UserSelectScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">あなたは誰ですか？</h1>
          <p className="text-sm text-gray-500">あなたの立場を選んでください</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => onSelect('夫')}
            className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-800 font-bold text-xl py-7 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            {user1Name}
          </button>
          <button
            type="button"
            onClick={() => onSelect('妻')}
            className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-800 font-bold text-xl py-7 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            {user2Name}
          </button>
        </div>
      </div>
    </div>
  );
}
