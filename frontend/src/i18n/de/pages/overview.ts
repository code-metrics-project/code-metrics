const overview = {
  security: {
    title: "Sicherheit",
    description: "Sicherheitslage und Schwachstellenberichte.",
  },
  narratives: {
    title: "Änderungen",
  },
  workload: {
    title: "Details zu dieser Arbeitslast.",
    notFound: "Arbeitslast nicht gefunden",
    recentChanges: "Letzte Änderungen",
    qualityGates: "Qualitätstore",
    codeQuality: "Codequalität",
    cicdPipeline: "CI/CD-Pipeline",
    pipelineHealth: "Pipeline-Gesundheit",
    bugsAndIncidents: "Fehler und Vorfälle",
    doraMetrics: "DORA-Metriken",
    analyse: "Analysieren",
    dependencyAlerts: "Abhängigkeitswarnungen",
    repositories: "Repositories",
  },
  workloads: {
    title: "Arbeitslasten",
    description: "Übersicht aller Arbeitslasten.",
    viewWorkload: "Arbeitslast anzeigen",
  },
  program: {
    title: "Programm",
    description: "Einblicke und Analysen auf Programmebene.",
    metrics: {
      title: "Metriken",
      description: "Statistiken und Metriken über das Programm.",
      action: "Metriken anzeigen",
      repositoryChurnTitle: "Repository-Fluktuation",
      repositoryChurnSubtitle: "Abrufen historischer Daten zur Repository-Fluktuation.",
    },
    changes: {
      title: "Änderungen",
      description: "Änderungen im gesamten Programm.",
      action: "Änderungen anzeigen",
    },
    pipelines: {
      title: "Pipelines",
      description: "Programm-Pipeline-Gesundheit.",
      action: "Pipelines anzeigen",
    },
    qualityGates: {
      title: "Qualitätstore",
      description: "Programm-Qualitätstor-Implementierungen.",
      action: "Qualitätstore anzeigen",
    },
    security: {
      title: "Sicherheit",
      description: "Programm-Sicherheitsberichte.",
      action: "Sicherheit anzeigen",
    },
    dependencyAlerts: {
      title: "Abhängigkeitswarnungen",
      description: "Programm-Schwachstellenwarnungen für Abhängigkeiten.",
      action: "Abhängigkeitswarnungen anzeigen",
    },
    repositories: {
      title: "Repositories",
      description: "Alle Repositories im Programm.",
      action: "Repositories anzeigen",
    },
  },
  repositories: {
    title: "Repositories",
    description: "Übersicht aller Repositories.",
    allTitle: "Alle Repositories",
    allDescription: "Alle Repositories über alle Arbeitslasten",
    workloadTitle: "Repositories - {{workloadName}}",
    workloadDescription: "Repositories in der Arbeitslast {{workloadName}}.",
    searchPlaceholder: "Repositories suchen...",
    found: "{{count}} Repositories gefunden",
    noRepositories: "Keine Repositories gefunden. Überprüfen Sie, ob die Arbeitslast-Konfiguration geladen ist.",
    colHeaders: {
      repository: "Repository",
      workload: "Arbeitslast",
      repoGroups: "Repo-Gruppen",
      actions: "Aktionen",
    },
    buttonPipelineHealth: "Pipeline-Gesundheit",
    buttonPipelineRuns: "Pipeline-Läufe",
  },
  home: {
    title: "Startseite",
    programme: {
      title: "Programm",
      description: "Ich interessiere mich für Daten auf Programmebene.",
      action: "Programmdaten anzeigen",
    },
    workload: {
      title: "Arbeitslasten",
      description: "Ich interessiere mich für meine Arbeitslast.",
      action: "Arbeitslast-Daten anzeigen",
    },
    explore: {
      title: "Erkunden",
      description: "Ich möchte die Daten erkunden.",
      action: "Daten erkunden",
    },
  },
};

export default overview;
