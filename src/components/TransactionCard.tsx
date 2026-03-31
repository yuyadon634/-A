'use client';

import { Check, X, ChevronDown, MessageSquare, Trash2, Image as ImageIcon, ScanLine } from 'lucide-react';
import { Transaction, User } from '@/types';
import { getCategoryIcon, getItemRequestedAmount } from '@/lib/utils';

interface BaseCardProps {
  tx: Transaction;
  expandedTxId: string | null;
  onToggleExpand: (id: string) => void;
  getDisplayName: (user: User | undefined) => string;
  onViewReceipt?: (url: string) => void;
}

interface PendingCardProps extends BaseCardProps {
  variant: 'pending';
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

interface HistoryCardProps extends BaseCardProps {
  variant: 'history';
  currentUser: User;
  onRequestDelete: (id: string) => void;
}

type TransactionCardProps = PendingCardProps | HistoryCardProps;

export function ReceiptItemAccordion({
  tx,
}: {
  tx: Transaction;
}) {
  const hasItems = !!(tx.receiptItems && tx.receiptItems.length > 0);
  const hasImage = !!tx.receiptImageUrl;

  if (!hasItems && !hasImage) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 text-sm animate-in slide-in-from-top-2 space-y-3">
      {/* レシート画像（両者が確認できる） */}
      {hasImage && (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
            <ImageIcon size={13} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">添付レシート</span>
          </div>
          <a href={tx.receiptImageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={tx.receiptImageUrl}
              alt="レシート画像"
              className="w-full object-contain max-h-56"
            />
          </a>
        </div>
      )}

      {/* 明細内訳 */}
      {hasItems && (
        <div>
          <p className="font-bold text-gray-700 mb-2">明細内訳</p>
          <div className="space-y-2">
            {tx.receiptItems!.map(item => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100/50"
              >
                <div>
                  <span className={`font-medium ${item.selected ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {item.name || '名称未設定'}
                  </span>
                  {item.selected && item.splitType !== 'none' && (
                    <span className="text-[10px] ml-2 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {item.splitType === 'split'
                        ? '割り勘'
                        : item.splitType === 'full'
                        ? '全額'
                        : item.splitType === 'amount'
                        ? `${item.customValue}円`
                        : `${item.customValue}%`}
                    </span>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`text-[11px] ${item.selected ? 'text-gray-500' : 'text-gray-400'}`}>
                    ¥{item.price.toLocaleString()}
                  </span>
                  {item.selected && item.splitType !== 'none' && (
                    <p className="text-xs font-bold text-blue-600">
                      請求: ¥{getItemRequestedAmount(item).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionCard(props: TransactionCardProps) {
  const { tx, expandedTxId, onToggleExpand, getDisplayName, onViewReceipt } = props;
  const isExpanded = expandedTxId === tx.id;

  if (props.variant === 'pending') {
    const { onApprove, onReject } = props;
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div
          className="flex justify-between items-start mb-3"
          onClick={() => onToggleExpand(tx.id)}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                申請者: {getDisplayName(tx.paidBy)}
              </span>
              <span className="text-xs text-gray-500">{tx.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <div className="bg-gray-100 p-1 rounded text-gray-500">
                {getCategoryIcon(tx.category)}
              </div>
              <p className="font-medium text-sm">
                {tx.category} / ¥{tx.amount.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-xs text-gray-500 mb-1">あなたへの請求</p>
            <div className="flex items-center gap-1">
              <p className="text-xl font-bold text-gray-900 leading-none">
                ¥{tx.requestedAmount.toLocaleString()}
              </p>
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
        </div>

        {tx.message && (
          <div className="mb-4 flex items-start gap-2 relative pl-1">
            <div className="absolute top-2.5 left-2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-blue-50 border-b-[6px] border-b-transparent" />
            <div className="bg-blue-50 border border-blue-100/50 rounded-2xl rounded-tl-sm px-4 py-2.5 ml-3 flex-1">
              <div className="flex items-center gap-1.5 mb-1 text-blue-800">
                <MessageSquare size={14} className="opacity-70" />
                <span className="text-[10px] font-bold opacity-80">
                  {getDisplayName(tx.paidBy)} からのひとこと
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{tx.message}</p>
            </div>
          </div>
        )}

        {isExpanded && <ReceiptItemAccordion tx={tx} />}

        {tx.receiptImageUrl && onViewReceipt && (
          <button
            onClick={() => onViewReceipt(tx.receiptImageUrl!)}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 py-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ScanLine size={14} /> レシートを見る
          </button>
        )}

        <div className="flex gap-3 mt-3">
          <button
            onClick={() => onReject(tx.id)}
            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2.5 rounded-lg text-sm font-semibold flex justify-center items-center gap-1.5 transition-colors border border-gray-200"
          >
            <X size={16} /> 差戻し
          </button>
          <button
            onClick={() => onApprove(tx.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold flex justify-center items-center gap-1.5 shadow-sm transition-colors"
          >
            <Check size={16} /> 承認する
          </button>
        </div>
      </div>
    );
  }

  // variant === 'history'
  const { currentUser, onRequestDelete } = props;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div
        className="flex justify-between items-start"
        onClick={() => onToggleExpand(tx.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
            {getCategoryIcon(tx.category)}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {tx.category} / ¥{tx.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {getDisplayName(tx.paidBy)}支払 ・ {tx.date}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold text-gray-800">
              請求: ¥{tx.requestedAmount.toLocaleString()}
            </p>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {tx.deleteStatus === 'requested' && tx.deleteRequestedBy === currentUser ? (
              <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full inline-block">
                削除申請中...
              </span>
            ) : tx.settlementStatus === 'requested' ? (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                精算申請中...
              </span>
            ) : (
              <>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onRequestDelete(tx.id);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  aria-label="削除申請"
                >
                  <Trash2 size={14} />
                </button>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                  承認済
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {tx.message && (
        <div className="mt-3 flex items-start gap-2 relative pl-1">
          <div className="absolute top-2.5 left-2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-100 border-b-[6px] border-b-transparent" />
          <div className="bg-gray-100/80 rounded-2xl rounded-tl-sm px-4 py-2.5 ml-3 flex-1">
            <div className="flex items-center gap-1.5 mb-1 text-gray-500">
              <MessageSquare size={12} className="opacity-70" />
              <span className="text-[10px] font-bold opacity-80">
                {getDisplayName(tx.paidBy)} からのひとこと
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{tx.message}</p>
          </div>
        </div>
      )}

      {isExpanded && <ReceiptItemAccordion tx={tx} />}

      {tx.receiptImageUrl && onViewReceipt && (
        <button
          onClick={() => onViewReceipt(tx.receiptImageUrl!)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ScanLine size={14} /> レシートを見る
        </button>
      )}
    </div>
  );
}
