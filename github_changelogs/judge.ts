// data/changelog.json の各記事について、タイトルだけを state にして Jev で3つの質問に答えさせる
// 結果は results/changelog-judge.json に保存する (集計は report.ts)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { callDecisions } from '../lib.ts';
import type { Item } from './fetch.ts';

export const questions = {
  // 1. Noul: Copilot 関連か
  is_copilot: {
    type: 'noul',
    instructions: 'この GitHub Changelog の記事は GitHub Copilot に関する内容ですか?',
    criteria: {
      true: 'GitHub Copilot の機能、モデル、エージェント、IDE 拡張、プランなどに関する記事。',
      false: 'GitHub Copilot とは関係のない GitHub の機能に関する記事。',
    },
  },
  // 2. Choice: 記事の種類
  category: {
    type: 'choice',
    instructions: 'この GitHub Changelog の記事はどの種類の告知ですか?',
    criteria: {
      new_release: '新機能、新製品、パブリックプレビュー、一般提供 (GA)、新しいモデルの提供開始などの新しいリリース。',
      improvement: '既存の機能の改善、強化、変更、性能向上。',
      retired: '機能や API、モデルなどの非推奨化、提供終了、廃止、削除。',
    },
  },
  // 3. Score: 読む価値 (5段階)
  value: {
    type: 'score',
    instructions:
      'GitHub Copilot と GitHub Actions に強い関心がある開発者にとって、この記事はどのくらい読む価値がありますか?',
    criteria: [
      '読む価値はまったくない',
      'あまり読む価値はない',
      'どちらとも言えない',
      '読む価値がある',
      'ぜひ読むべき',
    ],
  },
};

export type Judged = Item & { status: number; answers?: any; usage?: any; error?: string };

const CONCURRENCY = 4;

async function judge(item: Item): Promise<Judged> {
  for (let attempt = 1; ; attempt++) {
    const { status, raw } = await callDecisions({ title: item.title }, questions);
    if (status === 200) {
      const body = JSON.parse(raw);
      return { ...item, status, answers: body.answers, usage: body.usage };
    }
    if (attempt >= 2 || !(status === 429 || status >= 500)) {
      return { ...item, status, error: raw };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const items: Item[] = JSON.parse(readFileSync(join(import.meta.dirname, 'data/changelog.json'), 'utf8'));
const results: Judged[] = new Array(items.length);
let next = 0;
let done = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await judge(items[i]);
      done++;
      if (results[i].status !== 200) console.error(`FAILED (${results[i].status}): ${items[i].title}`);
      if (done % 16 === 0) console.log(`${done}/${items.length}`);
    }
  }),
);

const resultsDir = join(import.meta.dirname, 'results');
mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, 'changelog-judge.json'), JSON.stringify(results, null, 2) + '\n');
const ok = results.filter((r) => r.status === 200);
const cost = ok.reduce((a, r) => a + (r.usage?.cost ?? 0), 0);
console.log(`done: ${ok.length}/${results.length} ok, total cost $${cost.toFixed(6)}`);
