const support = {
  appUnavailable: {
    title: "基本設定を取得するために CodeMetrics API に接続できませんでした。",
    description: "API が稼働していることと接続情報が正しいことを確認し、ページを再読み込みしてください。",
    action: "ページを再読み込み",
  },
  configMissing: {
    title: "設定エラー",
    message:
      "アプリケーション設定を読み込めませんでした。ネットワークエラーまたはバックエンドの設定ミスが原因の可能性があります。サーバーログを確認して再試行してください。",
  },
  licenseMissing: {
    title: "ライセンスが必要です",
    description: "Code Metricsを使用するには有効なライセンスが必要です",
    message: "Code Metricsのインストールに有効なライセンスが設定されていません。",
    administrator: "管理者に連絡してください",
  },
  notFound: {
    title: "ページが見つかりません",
    description: "お探しのページは存在しません。",
  },
  unauthorised: {
    title: "アクセス拒否",
    description: "このページにアクセスする権限がありません。",
  },
};

export default support;
