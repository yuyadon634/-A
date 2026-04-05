/**
 * Web App Badging API を使ってアプリアイコンにバッジを表示するカスタムフック。
 *
 * - hasPendingItems が true  → ドットバッジを表示（iOS: 赤丸, Android: 色付きドット）
 * - hasPendingItems が false → バッジを消す
 *
 * 対応環境: iOS 16.4+ (ホーム画面 PWA) / Android Chrome (インストール済み PWA)
 * 非対応環境では何もしない（エラーにならない）。
 *
 * ⚠️ バッジはアプリが開いているときにしか更新されない。
 *    アプリを完全に閉じた状態での更新にはプッシュ通知 + Service Worker が必要。
 */
import { useEffect } from 'react';

export function useBadge(hasPendingItems: boolean) {
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;

    if (hasPendingItems) {
      // 引数なしで呼ぶことでドット表示（数字なし）になる
      navigator.setAppBadge().catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [hasPendingItems]);

  // ページを離れたとき（タブを閉じるなど）にバッジを自動クリアする
  useEffect(() => {
    return () => {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };
  }, []);
}
