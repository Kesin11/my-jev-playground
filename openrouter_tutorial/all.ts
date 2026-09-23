// 3つの質問を1回のリクエストでまとめて送る (チュートリアルと同じ形)
// 各質問は並列に回答され、互いの答えは参照されない
import { decide } from './decide.ts';
import { is_bug, team, urgency } from './questions.ts';

await decide({ is_bug, team, urgency });
