// OpenRouter Decisions API (Jev) を呼び出す共通ヘルパー
const ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
const MODEL = 'typesafe/jev-1.13';

// Decisions API を1回呼び出し、HTTP ステータスとレスポンスボディ (文字列) を返す
export async function callDecisions(
  state: Record<string, unknown>,
  questions: Record<string, unknown>,
): Promise<{ status: number; raw: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, state, questions }),
  });
  return { status: response.status, raw: await response.text() };
}
