const auth = {
  login: {
    title: "Sign In",
    pleaseWait: "Please wait",
    checkingStatus: "Checking login status...",
    username: "User name",
    password: "Password",
    usernamePlaceholder: "Enter your username",
    passwordPlaceholder: "Enter your password",
    button: "Log in",
  },
  logout: {
    authenticationError: "Authentication Error",
    signingOut: "Signing out...",
  },
  session: {
    expired: {
      title: "Session Expired",
      subtitle: "You have been logged out due to inactivity.",
      text: "Please log in again to continue.",
      confirm: "OK",
    },
    expiringSoon: {
      title: "Session Expiring Soon",
      subtitle: "You have been inactive for a while.",
      text: "Do you want to continue your session?",
      confirm: "Stay Logged In",
      cancel: "Logout",
    },
  },
};

export default auth;
