'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const TOAST_STYLES: Record<ToastType, { border: string; icon: React.ReactNode }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
  },
  info: {
    border: 'border-l-blue-500',
    icon: <Info size={18} className="text-blue-500 shrink-0" />,
  },
  warning: {
    border: 'border-l-amber-500',
    icon: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
  },
};

/** 4秒後に自動で消えるフローティングトースト通知 */
export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const { border, icon } = TOAST_STYLES[type];

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[60]
        flex items-center gap-3
        bg-white shadow-lg rounded-xl px-4 py-3
        border border-gray-100 border-l-4 ${border}
        max-w-[calc(100vw-2rem)] w-max
        animate-in slide-in-from-top-4 fade-in duration-300
      `}
    >
      {icon}
      <p className="text-sm font-semibold text-gray-800 pr-2">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        aria-label="閉じる"
      >
        <X size={16} />
      </button>
    </div>
  );
}
