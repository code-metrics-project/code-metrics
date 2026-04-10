const admin = {
  admin: {
    title: "Administración",
    description:
      "Administre la configuración de su instancia de Code Metrics y las tareas administrativas. Esta sección ofrece herramientas para la administración del sistema, la seguridad y la configuración de servicios.",
    cards: {
      tokens: {
        title: "Tokens de servicio",
        description: "Emita, revoque y gestione tokens de servicio para acceder a la API.",
        action: "Gestionar tokens de servicio",
      },
      datastores: {
        title: "Almacenes de datos",
        description: "Vea y gestione las colecciones y tablas de almacenamiento físico.",
        action: "Gestionar almacenes de datos",
      },
    },
    tokens: {
      title: "Tokens de servicio",
      description:
        "Gestione tokens de servicio de la API para sistemas automatizados y procesos en segundo plano. Los tokens de servicio proporcionan acceso seguro y de larga duración a la API de CodeMetrics.",
      createButton: "Crear token",
      table: {
        title: "Tokens de servicio activos",
        subject: "Asunto",
        created: "Creado",
        expires: "Expira",
        createdBy: "Creado por",
        actions: "Acciones",
      },
      empty: {
        title: "No se encontraron tokens de servicio",
        description: "Cree su primer token de servicio para comenzar a usar el acceso a la API.",
      },
      createDialog: {
        title: "Crear token de servicio",
        subjectLabel: "Nombre del asunto/servicio",
        subjectPlaceholder: "Introduzca un nombre descriptivo",
        subjectHelp: "Un nombre descriptivo para el servicio o aplicación que usará este token",
        successTitle: "Token creado correctamente",
        importantLabel: "Importante:",
        importantDescription: "Copie este token ahora. Por motivos de seguridad no se mostrará nuevamente.",
        doneButton: "Listo",
        cancelButton: "Cancelar",
        submitButton: "Crear token",
      },
      revokeDialog: {
        title: "¿Revocar token de servicio?",
        confirmMessage: "¿Está seguro de que desea revocar este token de servicio?",
        subjectLabel: "Asunto",
        createdLabel: "Creado",
        warning:
          "Esta acción no se puede deshacer. Cualquier sistema que use este token perderá acceso inmediatamente.",
        cancelButton: "Cancelar",
        submitButton: "Revocar token",
      },
      toast: {
        loadError: "No se pudieron cargar los tokens de servicio",
        createSuccess: "Token de servicio creado correctamente",
        createError: "No se pudo crear el token de servicio",
        revokeSuccess: "Token de servicio revocado correctamente",
        revokeError: "No se pudo revocar el token de servicio",
        copySuccess: "Token copiado al portapapeles",
      },
    },
    datastores: {
      title: "Almacenes de datos",
      description:
        "Vea y gestione las colecciones y tablas de almacenamiento físico que respaldan el almacén de datos. Estas son las entidades sin procesar del motor de almacenamiento (colecciones de MongoDB, tablas de DynamoDB, archivos de NeDB o contenedores en memoria).",
      table: {
        title: "Colecciones",
        name: "Nombre",
        actions: "Acciones",
      },
      empty: {
        title: "No se encontraron colecciones",
        description:
          "No se encontraron colecciones ni tablas de almacenamiento físico en el motor de almacenamiento activo.",
      },
      toast: {
        loadError: "No se pudieron cargar las colecciones del almacén de datos",
      },
      detail: {
        title: "Detalle de la colección",
        nameLabel: "Nombre de la colección",
        existsLabel: "Existe",
        existsYes: "Sí",
        existsNo: "No",
        countButton: "Contar elementos",
        countLabel: "Cantidad de elementos",
        countNotChecked: "Sin comprobar",
        emptyButton: "Vaciar colección",
        emptyDialog: {
          title: "¿Vaciar colección?",
          description:
            "¿Está seguro de que desea vaciar esta colección? Esto eliminará permanentemente todos los elementos.",
          warning: "Esta acción no se puede deshacer. Se perderán todos los datos de esta colección.",
          cancelButton: "Cancelar",
          submitButton: "Vaciar colección",
        },
        toast: {
          existsError: "No se pudo comprobar la existencia de la colección",
          countError: "No se pudieron contar los elementos",
          emptySuccess: "Colección vaciada correctamente",
          emptyError: "No se pudo vaciar la colección",
        },
      },
    },
  },
};

export default admin;
