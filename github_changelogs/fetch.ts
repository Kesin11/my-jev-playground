// https://github.blog/changelog/ の1ページ目から記事一覧を取得し data/changelog.json に保存する
// title だけを Jev に送り、type / labels は正答率計算用の正解データとしてのみ使う
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type Item = {
  title: string;
  url: string;
  date: string;
  type: string; // Release | Improvement | Retired
  labels: string[]; // copilot, actions, ...
};

const decodeEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const html = await (await fetch('https://github.blog/changelog/')).text();

const items: Item[] = [];
for (const block of html.split('<article>').slice(1)) {
  const link = block.match(/<a [^>]*href="([^"]+)" class="ChangelogItem-title"[^>]*>([\s\S]*?)<\/a>/);
  if (!link) continue;
  items.push({
    title: decodeEntities(link[2].trim()),
    url: link[1],
    date: block.match(/datetime="([^"]+)"/)?.[1] ?? '',
    type: block.match(/Tag--type-alt">([^<]*)/)?.[1].trim() ?? '',
    labels: [...block.matchAll(/\?label=([a-z0-9-]+)/g)].map((m) => m[1]),
  });
}

const dataDir = join(import.meta.dirname, 'data');
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'changelog.json'), JSON.stringify(items, null, 2) + '\n');

const count = (xs: string[]) => xs.reduce<Record<string, number>>((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {});
console.log(`${items.length} items saved to data/changelog.json`);
console.log('type:', count(items.map((i) => i.type)));
console.log('copilot label:', items.filter((i) => i.labels.includes('copilot')).length);
