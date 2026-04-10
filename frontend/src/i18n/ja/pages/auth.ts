const auth = {
  login: {
    title: "サインイン",
    pleaseWait: "お待ちください",
    checkingStatus: "ログイン状態を確認中...",
    username: "ユーザー名",
    password: "パスワード",
    usernamePlaceholder: "ユーザー名を入力",
    passwordPlaceholder: "パスワードを入力",
    button: "ログイン",
  },
  logout: {
    authenticationError: "認証エラー",
    signingOut: "サインアウト中...",
  },
  session: {
    expired: {
      title: "セッションの有効期限が切れました",
      subtitle: "一定時間操作がなかったためサインアウトされました。",
      text: "続行するには再度サインインしてください。",
      confirm: "OK",
    },
    expiringSoon: {
      title: "セッションの有効期限がまもなく切れます",
      subtitle: "しばらく操作がありません。",
      text: "セッションを継続しますか？",
      confirm: "サインインを維持",
      cancel: "サインアウト",
    },
  },
};

export default auth;
