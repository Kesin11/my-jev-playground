// チュートリアルの3つの質問 (日本語版)。個別実行と一括実行で共有する

// Choice: 定義した選択肢から1つを選び、各選択肢の確率を返す
export const team = {
  type: 'choice',
  instructions: 'このチケットはどのチームが担当すべきですか?',
  criteria: {
    payments: '決済ページ、請求、支払い処理に関する問題。',
    frontend: '画面表示、レイアウト、ブラウザ互換性に関する問題。',
    account: 'ログイン、権限、プロフィールに関する問題。',
  },
};

// Noul: yes/no の質問に答え、yes である確率を返す
export const is_bug = {
  type: 'noul',
  instructions: '顧客はソフトウェアの不具合を報告していますか?',
  criteria: {
    true: '顧客は製品が壊れている、または想定外の動作をしていると説明している。',
    false: '顧客は質問をしている、または機能をリクエストしている。',
  },
};

// Score: 定義した順序付きスケール上の位置を確率加重で返す (index 0 が最初の基準)
export const urgency = {
  type: 'score',
  instructions: 'このチケットの緊急度はどのくらいですか?',
  criteria: [
    '次回のリリースまで待てる',
    '今週中に修正すべき',
    '今まさに売上が止まっている',
  ],
};
