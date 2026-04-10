const overview = {
  security: {
    title: "Security",
    description: "Security posture and vulnerability reports.",
  },
  narratives: {
    title: "Changes",
  },
  workload: {
    title: "Details about this workload.",
    notFound: "Workload not found",
    recentChanges: "Recent changes",
    qualityGates: "Quality gates",
    codeQuality: "Code Quality",
    cicdPipeline: "CI/CD pipeline",
    pipelineHealth: "Pipeline health",
    bugsAndIncidents: "Bugs and incidents",
    doraMetrics: "DORA Metrics",
    analyse: "Analyse",
    dependencyAlerts: "Dependency Alerts",
    repositories: "Repositories",
  },
  workloads: {
    title: "Workloads",
    description: "Overview of all the workloads.",
    viewWorkload: "View workload",
  },
  program: {
    title: "Programme",
    description: "Programme-level insights and analytics.",
    metrics: {
      title: "Metrics",
      description: "Statistics and metrics about the programme.",
      action: "View Metrics",
      repositoryChurnTitle: "Repository churn",
      repositoryChurnSubtitle: "Retrieve historical data for repository churn.",
    },
    changes: {
      title: "Changes",
      description: "Changes across the programme.",
      action: "View Changes",
    },
    pipelines: {
      title: "Pipelines",
      description: "Programme pipeline health.",
      action: "View Pipelines",
    },
    qualityGates: {
      title: "Quality Gates",
      description: "Programme quality gate implementations.",
      action: "View Quality Gates",
    },
    security: {
      title: "Security",
      description: "Programme security reports.",
      action: "View Security",
    },
    dependencyAlerts: {
      title: "Dependency Alerts",
      description: "Programme dependency vulnerability alerts.",
      action: "View Dependency Alerts",
    },
    repositories: {
      title: "Repositories",
      description: "All repositories across the programme.",
      action: "View Repositories",
    },
  },
  repositories: {
    title: "Repositories",
    description: "Overview of all repositories.",
    allTitle: "All Repositories",
    allDescription: "All repositories across all workloads",
    workloadTitle: "Repositories - {{workloadName}}",
    workloadDescription: "Repositories in the {{workloadName}} workload.",
    searchPlaceholder: "Search repositories...",
    found: "{{count}} repositories found",
    noRepositories: "No repositories found. Check that workload configuration is loaded.",
    colHeaders: {
      repository: "Repository",
      workload: "Workload",
      repoGroups: "Repo Groups",
      actions: "Actions",
    },
    buttonPipelineHealth: "Pipeline Health",
    buttonPipelineRuns: "Pipeline Runs",
  },
  home: {
    title: "Home",
    programme: {
      title: "Programme",
      description: "I'm interested in programme level data.",
      action: "View programme data",
    },
    workload: {
      title: "Workloads",
      description: "I'm interested in my workload.",
      action: "View workload data",
    },
    explore: {
      title: "Explore",
      description: "I want to explore the data.",
      action: "Explore data",
    },
  },
};

export default overview;
