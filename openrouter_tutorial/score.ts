// Score を単独で実行する
import { decide } from './decide.ts';
import { urgency } from './questions.ts';

await decide({ urgency });
