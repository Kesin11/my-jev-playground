// チュートリアル用: サポートチケットの state で質問し、結果を表示して results/ に保存する
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { callDecisions } from '../lib.ts';

// チュートリアルと同じサポートチケットを題材にする
export const state = {
  customer_tier: 'enterprise',
  ticket:
    '「支払う」ボタンを押すと決済ページが真っ白になります。ブラウザを2種類試しましたが同じでした。',
};

export async function decide(questions: Record<string, unknown>): Promise<void> {
  const { status, raw } = await callDecisions(state, questions);

  // レスポンスボディを整形して表示する (キーの順序はレスポンスのまま)
  let body = raw;
  try {
    body = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // JSON でなければそのまま
  }
  console.log(`HTTP ${status}`);
  console.log(body);
  if (status < 200 || status >= 300) process.exit(1);

  // 成功したときだけ保存する (失敗時に過去の結果を上書きしない)
  const dir = join(import.meta.dirname, 'results');
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${basename(process.argv[1], '.ts')}.json`);
  writeFileSync(out, body + '\n');
  console.log(`saved to ${out}`);
}
