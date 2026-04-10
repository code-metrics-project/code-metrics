const admin = {
  admin: {
    title: "管理",
    description:
      "Code Metrics インスタンスの設定や管理タスクを操作します。このセクションでは、システム運用、セキュリティ管理、サービス構成のためのツールを提供します。",
    cards: {
      tokens: {
        title: "サービス トークン",
        description: "API へのアクセス用サービス トークンの発行、取り消し、管理を行います。",
        action: "サービス トークンを管理",
      },
      datastores: {
        title: "データ ストア",
        description: "物理ストレージのコレクションとテーブルを表示および管理します。",
        action: "データ ストアを管理",
      },
    },
    tokens: {
      title: "サービス トークン",
      description:
        "自動化システムやバックグラウンド処理のための API サービス トークンを管理します。サービス トークンは CodeMetrics API への安全で長期間のアクセスを提供します。",
      createButton: "トークンを作成",
      table: {
        title: "有効なサービス トークン",
        subject: "サブジェクト",
        created: "作成日",
        expires: "有効期限",
        createdBy: "作成者",
        actions: "操作",
      },
      empty: {
        title: "サービス トークンが見つかりません",
        description: "最初のサービス トークンを作成して API アクセスを開始しましょう。",
      },
      createDialog: {
        title: "サービス トークンを作成",
        subjectLabel: "サブジェクト/サービス名",
        subjectPlaceholder: "わかりやすい名前を入力",
        subjectHelp: "このトークンを使用するサービスまたはアプリケーションの説明的な名前",
        successTitle: "トークンを作成しました",
        importantLabel: "重要:",
        importantDescription: "今すぐこのトークンをコピーしてください。セキュリティのため再表示されません。",
        doneButton: "完了",
        cancelButton: "キャンセル",
        submitButton: "トークンを作成",
      },
      revokeDialog: {
        title: "サービス トークンを取り消しますか?",
        confirmMessage: "このサービス トークンを取り消してもよろしいですか?",
        subjectLabel: "サブジェクト",
        createdLabel: "作成日",
        warning: "この操作は元に戻せません。このトークンを使用しているシステムは直ちにアクセスを失います。",
        cancelButton: "キャンセル",
        submitButton: "トークンを取り消す",
      },
      toast: {
        loadError: "サービス トークンを読み込めませんでした",
        createSuccess: "サービス トークンを作成しました",
        createError: "サービス トークンの作成に失敗しました",
        revokeSuccess: "サービス トークンを取り消しました",
        revokeError: "サービス トークンの取り消しに失敗しました",
        copySuccess: "トークンをクリップボードにコピーしました",
      },
    },
    datastores: {
      title: "データ ストア",
      description:
        "データ ストアを支える物理ストレージのコレクションとテーブルを表示および管理します。これらはストレージ エンジンの生のエンティティです（MongoDB コレクション、DynamoDB テーブル、NeDB ファイル、またはインメモリ バケット）。",
      table: {
        title: "コレクション",
        name: "名前",
        actions: "操作",
      },
      empty: {
        title: "コレクションが見つかりません",
        description: "有効なストレージ エンジンに物理ストレージのコレクションまたはテーブルが見つかりませんでした。",
      },
      toast: {
        loadError: "データ ストアのコレクションを読み込めませんでした",
      },
      detail: {
        title: "コレクション詳細",
        nameLabel: "コレクション名",
        existsLabel: "存在",
        existsYes: "はい",
        existsNo: "いいえ",
        countButton: "項目数を数える",
        countLabel: "項目数",
        countNotChecked: "未確認",
        emptyButton: "コレクションを空にする",
        emptyDialog: {
          title: "コレクションを空にしますか?",
          description: "このコレクションを空にしてもよろしいですか? すべての項目が完全に削除されます。",
          warning: "この操作は元に戻せません。このコレクション内のすべてのデータが失われます。",
          cancelButton: "キャンセル",
          submitButton: "コレクションを空にする",
        },
        toast: {
          existsError: "コレクションの存在確認に失敗しました",
          countError: "項目数の取得に失敗しました",
          emptySuccess: "コレクションを空にしました",
          emptyError: "コレクションを空にできませんでした",
        },
      },
    },
  },
};

export default admin;
