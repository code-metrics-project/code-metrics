const support = {
  appUnavailable: {
    title: "Impossible d’atteindre l’API CodeMetrics pour récupérer la configuration de base.",
    description:
      "Vérifiez que l’API est en cours d’exécution et que les informations de connexion sont correctes, puis actualisez la page.",
    action: "Actualiser la page",
  },
  configMissing: {
    title: "Erreur de configuration",
    message:
      "La configuration de l'application n'a pas pu être chargée. Cela peut être dû à une erreur réseau ou à un backend mal configuré. Veuillez vérifier les journaux du serveur et réessayer.",
  },
  licenseMissing: {
    title: "Licence requise",
    description: "Une licence valide est requise pour utiliser Code Metrics",
    message: "Votre installation de Code Metrics n'a pas de licence valide configurée. Veuillez contacter votre",
    administrator: "administrateur",
  },
  notFound: {
    title: "Page non trouvée",
    description: "La page que vous recherchez n'existe pas.",
  },
  unauthorised: {
    title: "Interdit",
    description: "Vous n'avez pas la permission d'accéder à cette page.",
  },
};

export default support;
