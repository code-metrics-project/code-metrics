const overview = {
  security: {
    title: "Seguridad",
    description: "Postura de seguridad e informes de vulnerabilidades.",
  },
  narratives: {
    title: "Cambios",
  },
  workload: {
    title: "Detalles sobre esta carga de trabajo.",
    notFound: "Carga de trabajo no encontrada",
    recentChanges: "Cambios recientes",
    qualityGates: "Puertas de calidad",
    codeQuality: "Calidad del código",
    cicdPipeline: "Pipeline CI/CD",
    pipelineHealth: "Salud del pipeline",
    bugsAndIncidents: "Errores e incidentes",
    doraMetrics: "Métricas DORA",
    analyse: "Analizar",
    dependencyAlerts: "Alertas de dependencias",
    repositories: "Repositorios",
  },
  workloads: {
    title: "Cargas de trabajo",
    description: "Resumen de todas las cargas de trabajo.",
    viewWorkload: "Ver carga de trabajo",
  },
  program: {
    title: "Programa",
    description: "Información y análisis a nivel de programa.",
    metrics: {
      title: "Métricas",
      description: "Estadísticas y métricas sobre el programa.",
      action: "Ver métricas",
      repositoryChurnTitle: "Rotación de repositorios",
      repositoryChurnSubtitle: "Recupera datos históricos sobre la rotación de repositorios.",
    },
    changes: {
      title: "Cambios",
      description: "Cambios en todo el programa.",
      action: "Ver cambios",
    },
    pipelines: {
      title: "Pipelines",
      description: "Salud del pipeline del programa.",
      action: "Ver pipelines",
    },
    qualityGates: {
      title: "Puertas de calidad",
      description: "Implementaciones de puertas de calidad del programa.",
      action: "Ver puertas de calidad",
    },
    security: {
      title: "Seguridad",
      description: "Informes de seguridad del programa.",
      action: "Ver seguridad",
    },
    dependencyAlerts: {
      title: "Alertas de dependencias",
      description: "Alertas de vulnerabilidades de dependencias del programa.",
      action: "Ver alertas de dependencias",
    },
    repositories: {
      title: "Repositorios",
      description: "Todos los repositorios del programa.",
      action: "Ver repositorios",
    },
  },
  repositories: {
    title: "Repositorios",
    description: "Resumen de todos los repositorios.",
    allTitle: "Todos los repositorios",
    allDescription: "Todos los repositorios de todas las cargas de trabajo",
    workloadTitle: "Repositorios - {{workloadName}}",
    workloadDescription: "Repositorios en la carga de trabajo {{workloadName}}.",
    searchPlaceholder: "Buscar repositorios...",
    found: "{{count}} repositorios encontrados",
    noRepositories:
      "No se encontraron repositorios. Verifique que la configuración de la carga de trabajo esté cargada.",
    colHeaders: {
      repository: "Repositorio",
      workload: "Carga de trabajo",
      repoGroups: "Grupos de repos",
      actions: "Acciones",
    },
    buttonPipelineHealth: "Salud del pipeline",
    buttonPipelineRuns: "Ejecuciones del pipeline",
  },
  home: {
    title: "Inicio",
    programme: {
      title: "Programa",
      description: "Me interesan los datos a nivel de programa.",
      action: "Ver datos del programa",
    },
    workload: {
      title: "Cargas de trabajo",
      description: "Me interesa mi carga de trabajo.",
      action: "Ver datos de la carga de trabajo",
    },
    explore: {
      title: "Explorar",
      description: "Quiero explorar los datos.",
      action: "Explorar datos",
    },
  },
};

export default overview;
