// results/changelog-judge.json を集計し、正答率・混同行列・スコア上位/下位を表示する
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Judged } from './judge.ts';

const rows: Judged[] = JSON.parse(readFileSync(join(import.meta.dirname, 'results/changelog-judge.json'), 'utf8')).filter(
  (r: Judged) => r.status === 200,
);
const pct = (n: number, d: number) => `${n}/${d} (${((n / d) * 100).toFixed(1)}%)`;

// 1. Noul: copilot ラベルの有無が正解。0.5 以上を「はい」とみなす
console.log('## 1. Copilot 関連か (Noul, しきい値 0.5)');
const noul = rows.map((r) => ({ r, truth: r.labels.includes('copilot'), p: r.answers.is_copilot.noul as number }));
const tp = noul.filter((x) => x.truth && x.p >= 0.5).length;
const fn = noul.filter((x) => x.truth && x.p < 0.5).length;
const fp = noul.filter((x) => !x.truth && x.p >= 0.5).length;
const tn = noul.filter((x) => !x.truth && x.p < 0.5).length;
console.log(`正答率: ${pct(tp + tn, rows.length)}`);
console.log(`              予測:はい  予測:いいえ`);
console.log(`正解:copilot     ${String(tp).padStart(3)}      ${String(fn).padStart(3)}`);
console.log(`正解:それ以外    ${String(fp).padStart(3)}      ${String(tn).padStart(3)}`);
console.log('誤判定:');
for (const x of noul.filter((x) => x.truth !== x.p >= 0.5)) {
  console.log(`  [正解:${x.truth ? 'copilot' : 'それ以外'} p=${x.p}] ${x.r.title} (labels: ${x.r.labels.join(', ')})`);
}

// 2. Choice: 記事の type が正解
console.log('\n## 2. カテゴリ (Choice)');
const map: Record<string, string> = { Release: 'new_release', Improvement: 'improvement', Retired: 'retired' };
const cats = ['new_release', 'improvement', 'retired'];
const choice = rows.map((r) => ({ r, truth: map[r.type], pred: r.answers.category.choice as string }));
const correct = choice.filter((x) => x.truth === x.pred).length;
const majority = Math.max(...cats.map((c) => choice.filter((x) => x.truth === c).length));
console.log(`正答率: ${pct(correct, rows.length)}  (全部を最多クラスと答えた場合のベースライン: ${pct(majority, rows.length)})`);
console.log(`正解＼予測     ${cats.map((c) => c.padStart(12)).join('')}`);
for (const t of cats) {
  const cells = cats.map((p) => String(choice.filter((x) => x.truth === t && x.pred === p).length).padStart(12));
  console.log(`${t.padEnd(14)}${cells.join('')}`);
}
console.log('誤判定:');
for (const x of choice.filter((x) => x.truth !== x.pred)) {
  console.log(`  [正解:${x.truth} 予測:${x.pred} ${JSON.stringify(x.r.answers.category.probabilities)}] ${x.r.title}`);
}

// 3. Score: 正解なし。上位と下位を表示
console.log('\n## 3. 読む価値 (Score, 0=読む価値はまったくない 〜 4=ぜひ読むべき)');
const sorted = [...rows].sort((a, b) => b.answers.value.score - a.answers.value.score);
const line = (r: Judged) => `  ${r.answers.value.score.toFixed(2)}  ${r.title}  [${r.labels.join(', ')}]`;
console.log('上位15件:');
sorted.slice(0, 15).forEach((r) => console.log(line(r)));
console.log('下位10件:');
sorted.slice(-10).forEach((r) => console.log(line(r)));
const hist = [0, 1, 2, 3, 4].map((k) => rows.filter((r) => Math.round(r.answers.value.score) === k).length);
console.log(`分布 (score を四捨五入): ${hist.map((n, k) => `${k}:${n}`).join('  ')}`);
