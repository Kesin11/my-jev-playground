# my-jev-playground

OpenRouter で提供されている TypeSafe の判定モデル **Jev** (`typesafe/jev-1.13`) を試すプレイグラウンドです。

Jev は文章を生成する LLM ではなく、与えた状態 (`state`) について型付きの質問に答え、答えを確率付きで返します。質問には次の3種類があります。

| 種類 | 用途 | 返り値 |
|---|---|---|
| **Choice** | 定義した選択肢から1つを選ぶ | 選ばれた選択肢、各選択肢の確率、`confidence` |
| **Noul** | はい / いいえで答える | 「はい」の確率 (0〜1) |
| **Score** | 順序付きの段階のどこに当たるかを答える | 確率で重み付けした位置 (index 0 が最初の段階)、各段階の確率、`confidence` |

## セットアップ

- Node.js 24 以上 (`.ts` をそのまま `node` で実行します。依存パッケージはありません)
- OpenRouter の API キー ([openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)) を環境変数 `OPENROUTER_API_KEY` に設定する

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

キーを 1Password で管理している場合は、実行するときだけ `op read` で取り出して渡すこともできます (WSL から Windows の 1Password CLI を使う場合は `op.exe`)。

```bash
OPENROUTER_API_KEY="$(op read 'op://<vault>/<item>/<field>')" node openrouter_tutorial/all.ts
```

## ディレクトリ構成

```
lib.ts                   Decisions API (https://openrouter.ai/api/alpha/decisions) を呼ぶ共通処理
openrouter_tutorial/     OpenRouter の Jev チュートリアルを TypeScript で試したもの
github_changelogs/       GitHub Changelog の記事タイトルを Jev で判定した実践
```

---

## 1. openrouter_tutorial: チュートリアルを試す

[OpenRouter の Jev チュートリアル](https://openrouter.ai/docs/guides/community/jev-tutorial)を、curl ではなく TypeScript で試しました。

### やったこと

- チュートリアルと同じサポートチケットを題材にし、質問文・選択肢・チケット本文を日本語にしました。
  - チケット: 「支払う」ボタンを押すと決済ページが真っ白になります。ブラウザを2種類試しましたが同じでした。
- チュートリアルは3つの質問を1回のリクエストで送る例ですが、1種類ずつ確認できるように、質問ごとのスクリプトも分けました。
- 最後に3つをまとめて1回で送り、個別に送った場合と結果・料金を比べました。

| ファイル | 内容 |
|---|---|
| [questions.ts](openrouter_tutorial/questions.ts) | 3つの質問の定義 |
| [decide.ts](openrouter_tutorial/decide.ts) | リクエストを送り、整形したレスポンスを `results/` に保存する |
| [choice.ts](openrouter_tutorial/choice.ts) | Choice: このチケットはどのチームが担当すべきか (payments / frontend / account) |
| [noul.ts](openrouter_tutorial/noul.ts) | Noul: 顧客はソフトウェアの不具合を報告しているか |
| [score.ts](openrouter_tutorial/score.ts) | Score: 緊急度 (次回のリリースまで待てる / 今週中に修正すべき / 今まさに売上が止まっている) |
| [all.ts](openrouter_tutorial/all.ts) | 3つの質問を1回のリクエストでまとめて送る |

```bash
node openrouter_tutorial/choice.ts   # noul.ts / score.ts / all.ts も同様
```

### 結果

レスポンスは [openrouter_tutorial/results/](openrouter_tutorial/results/) に保存しています。

| 質問 | 個別に送ったとき | まとめて送ったとき | 英語版チュートリアルの例 |
|---|---|---|---|
| Choice (担当チーム) | payments 0.86 / frontend 0.14 (confidence 0.79) | payments 0.81 / frontend 0.19 (confidence 0.72) | payments 0.78 / frontend 0.22 (confidence 0.67) |
| Noul (不具合か) | 0.97 | 0.97 | 0.96 |
| Score (緊急度) | 1.79 (index 2 が 0.8) | 1.77 (index 2 が 0.77) | 1.99 (index 2 が 1) |

- 日本語にしても、英語版とほぼ同じ判定になりました。Score だけは英語版よりやや「今週中に修正すべき」寄りでした。
- 同じリクエストでも、実行するたびに確率が数ポイント変わります。Choice を2回送ったときは payments が 0.83 と 0.86 でした。
- Score のレスポンスの `legend` には、送った日本語の段階がそのまま入って返ってきます。

**料金の比較**

| | 入力トークン | 料金 |
|---|---|---|
| 個別に3回 | 1,300 (462 + 433 + 405) | 約 $0.0000546 |
| まとめて1回 | 656 | 約 $0.0000276 |

同じ `state` について互いに依存しない質問は、まとめて送るとほぼ半額になりました。質問はそれぞれ並列に答えられ、ほかの質問の答えは参照しません。前の答えを使う質問は、リクエストを分けてコード側でつなぐ必要があります。

---

## 2. github_changelogs: GitHub Changelog の記事タイトルを判定する

[GitHub Changelog](https://github.blog/changelog/) の1ページ目の記事64件 (2026-09-23 時点) について、**タイトルだけ**を Jev に送って3つの質問に答えさせました。ページ上のラベルや種類は Jev には送らず、正答率の計算にだけ使っています。

### やったこと

1つの記事につき1リクエストで、次の3つの質問をまとめて送りました。質問文は [judge.ts](github_changelogs/judge.ts) にあります。

| # | 種類 | 質問 | 正解データ |
|---|---|---|---|
| 1 | Noul | GitHub Copilot に関する内容か | `copilot` ラベルが付いているか |
| 2 | Choice | どの種類の告知か (new_release / improvement / retired) | 記事の種類 (Release / Improvement / Retired) |
| 3 | Score | GitHub Copilot と GitHub Actions に強い関心がある開発者にとって読む価値があるか (5段階) | なし |

| ファイル | 内容 |
|---|---|
| [fetch.ts](github_changelogs/fetch.ts) | 記事一覧を取得し、タイトル・URL・日付・種類・ラベルを [data/changelog.json](github_changelogs/data/changelog.json) に保存する |
| [judge.ts](github_changelogs/judge.ts) | タイトルだけを `state` にして判定し、[results/changelog-judge.json](github_changelogs/results/changelog-judge.json) に保存する |
| [report.ts](github_changelogs/report.ts) | 正答率、混同行列、誤判定の一覧、スコアの上位と下位を表示する (API は呼ばない) |

```bash
node github_changelogs/fetch.ts    # 記事一覧を取り直す (ページは毎日変わるので、再現するときは不要)
node github_changelogs/judge.ts    # Jev で判定する (64件で約 $0.0018)
node github_changelogs/report.ts   # 集計する
```

### 結果

64件すべて判定でき、料金は合計約 **$0.0018** でした。

#### 1. Copilot 関連か (Noul、0.5 以上を「はい」とした): 正答率 60/64 (93.8%)

| | 予測: はい | 予測: いいえ |
|---|---|---|
| 正解: copilot | 27 | 3 |
| 正解: それ以外 | 1 | 33 |

誤判定の4件は、ほとんどがタイトルだけでは判断しにくいものでした。

- Copilot の記事を「いいえ」とした3件
  - `OpenAI’s GPT-6 Sol and GPT-6 Luna now available` (p=0.06) と `MAI-Code-1-Flash deprecated` (p=0.4) は、タイトルに Copilot と書かれていません。
  - `Set an expiration date for individual user budgets` (p=0.17) は、タイトルからは予算管理の話にしか見えません。
- それ以外の記事を「はい」とした1件
  - `Remediate Code Quality findings with agentic autofix` (p=0.62)。「agentic」という語で Copilot 寄りと判断したようです。

#### 2. 告知の種類 (Choice): 正答率 47/64 (73.4%)

全部を一番多い new_release と答えるだけでも 31/64 (48.4%) になります。

| 正解＼予測 | new_release | improvement | retired |
|---|---|---|---|
| new_release | 27 | 4 | 0 |
| improvement | 12 | 14 | 0 |
| retired | 0 | 1 | 6 |

- 誤判定のほとんどは、Improvement の記事を new_release と判定したものでした (12件)。
- ページ上の分類も、タイトルからは判断できない場合が多いです。
  - `Ubuntu 26 generally available and latest migration` や `AI Scan for pull request APIs in public preview` は、タイトルに「generally available」「public preview」とあるのに、正解は Improvement でした。
  - `Security improvements for SSH` は正解が Retired でした。
- 誤判定のうち約半数は確率が 0.4〜0.6 の接戦でした。確率が低いものは人が確認する、という使い方が向いていそうです。

#### 3. 読む価値 (Score、0 = 読む価値はまったくない 〜 4 = ぜひ読むべき)

正解データはないので、並び順を見て判断します。

| 順位 | スコア | タイトル |
|---|---|---|
| 1 | 3.54 | Copilot code review can now approve pull requests |
| 2 | 3.23 | Remediate Code Quality findings with agentic autofix |
| 3 | 3.15 | Auto-resolution and analysis updates in Copilot code review |
| 4 | 3.14 | Block pull requests with exposed secrets from merging |
| 5 | 3.12 | Control GitHub Actions cache access with cache-mode |
| 6 | 2.95 | Workflow execution protections in GitHub Actions generally available |
| … | | |
| 63 | 0.60 | Set an expiration date for individual user budgets |
| 64 | 0.50 | Profiles now show your highest achievement badge tier |

- 上位には Copilot code review や GitHub Actions の記事が並び、下位には関心の薄そうな記事が並びました。おおむね関心に合った並びです。
- `OpenAI’s GPT-6 Sol and GPT-6 Luna now available` (0.63) は下位に入りました。タイトルに Copilot と書かれていないため、Copilot に関係ある記事と気付けていないようです。
- 分布 (スコアを四捨五入): 0:0 / 1:16 / 2:31 / 3:16 / 4:1。真ん中に集まる傾向がありました。

### わかったこと

- タイトルだけでも、Copilot 関連かどうかはかなり正確に判定できました。
- 告知の種類はタイトルからは判断できない記事が多く、精度はそこそこでした。本文も `state` に入れれば改善する可能性があります。
- 質問の文言を変えれば精度を上げられるかもしれません。ただし、この64件の結果を見ながら文言を変えると、同じ64件でしか確かめられないので、正答率は実際より高く出やすくなります。
