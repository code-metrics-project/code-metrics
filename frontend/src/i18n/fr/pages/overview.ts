const overview = {
  security: {
    title: "Sécurité",
    description: "Posture de sécurité et rapports de vulnérabilités.",
  },
  narratives: {
    title: "Modifications",
  },
  workload: {
    title: "Détails sur cette charge de travail.",
    notFound: "Charge de travail non trouvée",
    recentChanges: "Modifications récentes",
    qualityGates: "Portes qualité",
    codeQuality: "Qualité du code",
    cicdPipeline: "Pipeline CI/CD",
    pipelineHealth: "Santé du pipeline",
    bugsAndIncidents: "Bugs et incidents",
    doraMetrics: "Métriques DORA",
    analyse: "Analyser",
    dependencyAlerts: "Alertes de dépendances",
    repositories: "Dépôts",
  },
  workloads: {
    title: "Charges de travail",
    description: "Aperçu de toutes les charges de travail.",
    viewWorkload: "Voir la charge de travail",
  },
  program: {
    title: "Programme",
    description: "Analyses et informations au niveau du programme.",
    metrics: {
      title: "Métriques",
      description: "Statistiques et métriques sur le programme.",
      action: "Voir les métriques",
      repositoryChurnTitle: "Rotation des dépôts",
      repositoryChurnSubtitle: "Récupérer des données historiques sur la rotation des dépôts.",
    },
    changes: {
      title: "Modifications",
      description: "Modifications à travers le programme.",
      action: "Voir les modifications",
    },
    pipelines: {
      title: "Pipelines",
      description: "Santé des pipelines du programme.",
      action: "Voir les pipelines",
    },
    qualityGates: {
      title: "Portes qualité",
      description: "Implémentations des portes qualité du programme.",
      action: "Voir les portes qualité",
    },
    security: {
      title: "Sécurité",
      description: "Rapports de sécurité du programme.",
      action: "Voir la sécurité",
    },
    dependencyAlerts: {
      title: "Alertes de dépendances",
      description: "Alertes de vulnérabilités des dépendances du programme.",
      action: "Voir les alertes de dépendances",
    },
    repositories: {
      title: "Dépôts",
      description: "Tous les dépôts du programme.",
      action: "Voir les dépôts",
    },
  },
  repositories: {
    title: "Dépôts",
    description: "Aperçu de tous les dépôts.",
    allTitle: "Tous les dépôts",
    allDescription: "Tous les dépôts de toutes les charges de travail",
    workloadTitle: "Dépôts - {{workloadName}}",
    workloadDescription: "Dépôts dans la charge de travail {{workloadName}}.",
    searchPlaceholder: "Rechercher des dépôts...",
    found: "{{count}} dépôts trouvés",
    noRepositories: "Aucun dépôt trouvé. Vérifiez que la configuration de la charge de travail est chargée.",
    colHeaders: {
      repository: "Dépôt",
      workload: "Charge de travail",
      repoGroups: "Groupes de dépôts",
      actions: "Actions",
    },
    buttonPipelineHealth: "Santé du pipeline",
    buttonPipelineRuns: "Exécutions du pipeline",
  },
  home: {
    title: "Accueil",
    programme: {
      title: "Programme",
      description: "Je m'intéresse aux données au niveau du programme.",
      action: "Voir les données du programme",
    },
    workload: {
      title: "Charges de travail",
      description: "Je m'intéresse à ma charge de travail.",
      action: "Voir les données de la charge de travail",
    },
    explore: {
      title: "Explorer",
      description: "Je veux explorer les données.",
      action: "Explorer les données",
    },
  },
};

export default overview;
