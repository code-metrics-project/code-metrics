const support = {
  appUnavailable: {
    title: "No se pudo acceder a la API de CodeMetrics para obtener la configuración básica.",
    description:
      "Comprueba que la API esté en ejecución y que los datos de conexión sean correctos y vuelve a cargar la página.",
    action: "Actualizar página",
  },
  configMissing: {
    title: "Error de configuración",
    message:
      "No se pudo cargar la configuración de la aplicación. Esto puede deberse a un error de red o a un backend mal configurado. Por favor, revise los registros del servidor e inténtelo de nuevo.",
  },
  licenseMissing: {
    title: "Licencia requerida",
    description: "Se requiere una licencia válida para usar Code Metrics",
    message: "Su instalación de Code Metrics no tiene una licencia válida configurada. Por favor contacte a su",
    administrator: "administrador",
  },
  notFound: {
    title: "Página no encontrada",
    description: "La página que busca no existe.",
  },
  unauthorised: {
    title: "Prohibido",
    description: "No tiene permiso para acceder a esta página.",
  },
};

export default support;
