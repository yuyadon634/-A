/**
 * クライアント側の画像処理ユーティリティ（純粋関数・React 非依存）。
 * Supabase Storage を使わず、DB の TEXT カラムへ直接保存できる data URL を生成する。
 */

/**
 * レシート画像を圧縮して data URL として返す。
 * 最大辺 800px・JPEG 品質 65% に圧縮（目安: 70〜180KB → base64 で 100〜250KB）
 *
 * @returns 圧縮後の data URL。画像読み込みやキャンバス取得に失敗した場合は null。
 */
export function compressImageToDataUrl(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_PX = 800;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_PX) {
          height = Math.round((height * MAX_PX) / width);
          width = MAX_PX;
        }
      } else {
        if (height > MAX_PX) {
          width = Math.round((width * MAX_PX) / height);
          height = MAX_PX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}
