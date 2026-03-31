import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type OcrItem = { name: string; price: number };

function isOcrItem(v: unknown): v is OcrItem {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).name === 'string' &&
    typeof (v as Record<string, unknown>).price === 'number'
  );
}

export async function POST(req: NextRequest) {
  // ① APIキー未設定を早期検知
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'AI機能が現在利用できません。しばらく後にお試しください。' },
      { status: 503 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    // ② ファイルサイズ検証
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `ファイルサイズが大きすぎます（最大 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB）` },
        { status: 400 },
      );
    }

    // ③ MIMEタイプ検証
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていない画像形式です。JPEG・PNG・WebPをお試しください。' },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');

    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `提供されたレシート画像から、購入した商品の「品名」と「税込み金額」のリストを抽出してください。

【重要なルール】
- 金額は必ず「税込み金額（消費税込み）」を使用してください。
- レシートに税抜き金額しか記載されていない場合は、以下のルールで税込み金額を計算してください。
  - 「*」マーク付き（軽減税率対象）の商品 → 税抜き金額 × 1.08 を四捨五入
  - それ以外の商品 → 税抜き金額 × 1.10 を四捨五入
- レシートに税込み金額が明示されている場合（「内税」「税込」など）はそちらを使用してください。
- 合計欄・消費税欄・小計欄・支払い方法欄などは除外し、個別商品のみ出力してください。

結果は以下のJSON配列形式のみで出力してください。マークダウン（\`\`\`json など）やその他の説明テキストは絶対に含めないでください。
[{"name": "商品名", "price": 108}]`;

    // ④ AI呼び出しを独立したtry-catchで囲み、エラー種別を区別
    let rawText: string;
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType: file.type } },
            ],
          },
        ],
      });
      rawText = response.text ?? '';
    } catch (aiError) {
      console.error('Gemini API error:', aiError);
      return NextResponse.json(
        { error: 'AI読み取りサービスへの接続に失敗しました。しばらく後にお試しください。' },
        { status: 502 },
      );
    }

    // ⑤ マークダウン除去 → JSON.parseを安全に実行
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error('JSON parse failed. Raw AI response:', rawText);
      return NextResponse.json(
        { error: 'レシートの内容を読み取れませんでした。別の角度や明るさで撮り直してください。' },
        { status: 422 },
      );
    }

    // ⑥ 配列かどうかの検証
    if (!Array.isArray(parsed)) {
      console.error('AI response is not an array:', parsed);
      return NextResponse.json(
        { error: 'レシートから商品リストを取得できませんでした。' },
        { status: 422 },
      );
    }

    // ⑦ 各アイテムを型ガードでフィルタ（壊れたアイテムを除外）
    const items: OcrItem[] = parsed.filter(isOcrItem);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Unexpected OCR error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました。' },
      { status: 500 },
    );
  }
}
