const overview = {
  security: {
    title: "セキュリティ",
    description: "セキュリティ態勢と脆弱性レポート。",
  },
  narratives: {
    title: "変更",
  },
  workload: {
    title: "このワークロードの詳細。",
    notFound: "ワークロードが見つかりません",
    recentChanges: "最近の変更",
    qualityGates: "品質ゲート",
    codeQuality: "コード品質",
    cicdPipeline: "CI/CDパイプライン",
    pipelineHealth: "パイプライン健全性",
    bugsAndIncidents: "バグとインシデント",
    doraMetrics: "DORAメトリクス",
    analyse: "分析",
    dependencyAlerts: "依存関係アラート",
    repositories: "リポジトリ",
  },
  workloads: {
    title: "ワークロード",
    description: "すべてのワークロードの概要。",
    viewWorkload: "ワークロードを表示",
  },
  program: {
    title: "プログラム",
    description: "プログラムレベルのインサイトと分析。",
    metrics: {
      title: "メトリクス",
      description: "プログラムに関する統計とメトリクス。",
      action: "メトリクスを表示",
      repositoryChurnTitle: "リポジトリチャーン",
      repositoryChurnSubtitle: "リポジトリのチャーンに関する履歴データを取得します。",
    },
    changes: {
      title: "変更",
      description: "プログラム全体の変更。",
      action: "変更を表示",
    },
    pipelines: {
      title: "パイプライン",
      description: "プログラムパイプライン健全性。",
      action: "パイプラインを表示",
    },
    qualityGates: {
      title: "品質ゲート",
      description: "プログラム品質ゲートの実装。",
      action: "品質ゲートを表示",
    },
    security: {
      title: "セキュリティ",
      description: "プログラムセキュリティレポート。",
      action: "セキュリティを表示",
    },
    dependencyAlerts: {
      title: "依存関係アラート",
      description: "プログラム依存関係の脆弱性アラート。",
      action: "依存関係アラートを表示",
    },
    repositories: {
      title: "リポジトリ",
      description: "プログラム全体のすべてのリポジトリ。",
      action: "リポジトリを表示",
    },
  },
  repositories: {
    title: "リポジトリ",
    description: "すべてのリポジトリの概要。",
    allTitle: "すべてのリポジトリ",
    allDescription: "すべてのワークロードのリポジトリ",
    workloadTitle: "リポジトリ - {{workloadName}}",
    workloadDescription: "{{workloadName}}ワークロードのリポジトリ。",
    searchPlaceholder: "リポジトリを検索...",
    found: "{{count}}件のリポジトリが見つかりました",
    noRepositories: "リポジトリが見つかりません。ワークロード設定が読み込まれているか確認してください。",
    colHeaders: {
      repository: "リポジトリ",
      workload: "ワークロード",
      repoGroups: "リポジトリグループ",
      actions: "アクション",
    },
    buttonPipelineHealth: "パイプライン健全性",
    buttonPipelineRuns: "パイプライン実行",
  },
  home: {
    title: "ホーム",
    programme: {
      title: "プログラム",
      description: "プログラムレベルのデータに興味があります。",
      action: "プログラムデータを表示",
    },
    workload: {
      title: "ワークロード",
      description: "自分のワークロードに興味があります。",
      action: "ワークロードデータを表示",
    },
    explore: {
      title: "探索",
      description: "データを探索したい。",
      action: "データを探索",
    },
  },
};

export default overview;
