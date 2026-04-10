const auth = {
  login: {
    title: "Connexion",
    pleaseWait: "Veuillez patienter",
    checkingStatus: "Vérification du statut de connexion...",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    usernamePlaceholder: "Entrez votre nom d'utilisateur",
    passwordPlaceholder: "Entrez votre mot de passe",
    button: "Se connecter",
  },
  logout: {
    authenticationError: "Erreur d'authentification",
    signingOut: "Déconnexion...",
  },
  session: {
    expired: {
      title: "Session expirée",
      subtitle: "Vous avez été déconnecté en raison d'une inactivité.",
      text: "Veuillez vous reconnecter pour continuer.",
      confirm: "OK",
    },
    expiringSoon: {
      title: "Session sur le point d'expirer",
      subtitle: "Vous êtes inactif depuis un moment.",
      text: "Souhaitez-vous continuer votre session ?",
      confirm: "Rester connecté",
      cancel: "Se déconnecter",
    },
  },
};

export default auth;
