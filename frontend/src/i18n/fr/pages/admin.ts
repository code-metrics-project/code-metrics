const admin = {
  admin: {
    title: "Administration",
    description:
      "Gérez la configuration de votre instance Code Metrics et les tâches administratives. Cette section fournit des outils pour l'administration du système, la gestion de la sécurité et la configuration des services.",
    cards: {
      tokens: {
        title: "Jetons de service",
        description: "Émettre, révoquer et gérer les jetons de service pour l'accès à l'API.",
        action: "Gérer les jetons de service",
      },
      datastores: {
        title: "Stockages de données",
        description: "Afficher et gérer les collections et tables de stockage physique.",
        action: "Gérer les stockages de données",
      },
    },
    tokens: {
      title: "Jetons de service",
      description:
        "Gérez les jetons de service de l'API pour les systèmes automatisés et les processus en arrière-plan. Les jetons de service offrent un accès sécurisé et durable à l'API CodeMetrics.",
      createButton: "Créer un jeton",
      table: {
        title: "Jetons de service actifs",
        subject: "Sujet",
        created: "Créé",
        expires: "Expire",
        createdBy: "Créé par",
        actions: "Actions",
      },
      empty: {
        title: "Aucun jeton de service trouvé",
        description: "Créez votre premier jeton de service pour commencer à utiliser l'accès à l'API.",
      },
      createDialog: {
        title: "Créer un jeton de service",
        subjectLabel: "Nom du sujet/service",
        subjectPlaceholder: "Entrez un nom descriptif",
        subjectHelp: "Un nom descriptif pour le service ou l'application qui utilisera ce jeton",
        successTitle: "Jeton créé avec succès",
        importantLabel: "Important :",
        importantDescription: "Copiez ce jeton maintenant. Pour des raisons de sécurité, il ne sera plus affiché.",
        doneButton: "Terminé",
        cancelButton: "Annuler",
        submitButton: "Créer le jeton",
      },
      revokeDialog: {
        title: "Révoquer le jeton de service ?",
        confirmMessage: "Êtes-vous sûr de vouloir révoquer ce jeton de service ?",
        subjectLabel: "Sujet",
        createdLabel: "Créé",
        warning: "Cette action est irréversible. Tout système utilisant ce jeton perdra immédiatement l'accès.",
        cancelButton: "Annuler",
        submitButton: "Révoquer le jeton",
      },
      toast: {
        loadError: "Échec du chargement des jetons de service",
        createSuccess: "Jeton de service créé avec succès",
        createError: "Échec de la création du jeton de service",
        revokeSuccess: "Jeton de service révoqué avec succès",
        revokeError: "Échec de la révocation du jeton de service",
        copySuccess: "Jeton copié dans le presse-papiers",
      },
    },
    datastores: {
      title: "Stockages de données",
      description:
        "Affichez et gérez les collections et tables de stockage physique qui soutiennent le magasin de données. Il s'agit des entités brutes du moteur de stockage (collections MongoDB, tables DynamoDB, fichiers NeDB ou compartiments en mémoire).",
      table: {
        title: "Collections",
        name: "Nom",
        actions: "Actions",
      },
      empty: {
        title: "Aucune collection trouvée",
        description:
          "Aucune collection ni table de stockage physique n'a été trouvée dans le moteur de stockage actif.",
      },
      toast: {
        loadError: "Échec du chargement des collections du stockage de données",
      },
      detail: {
        title: "Détail de la collection",
        nameLabel: "Nom de la collection",
        existsLabel: "Existe",
        existsYes: "Oui",
        existsNo: "Non",
        countButton: "Compter les éléments",
        countLabel: "Nombre d'éléments",
        countNotChecked: "Non vérifié",
        emptyButton: "Vider la collection",
        emptyDialog: {
          title: "Vider la collection ?",
          description:
            "Êtes-vous sûr de vouloir vider cette collection ? Cela supprimera définitivement tous les éléments.",
          warning: "Cette action est irréversible. Toutes les données de cette collection seront perdues.",
          cancelButton: "Annuler",
          submitButton: "Vider la collection",
        },
        toast: {
          existsError: "Échec de la vérification de l'existence de la collection",
          countError: "Échec du comptage des éléments",
          emptySuccess: "Collection vidée avec succès",
          emptyError: "Échec du vidage de la collection",
        },
      },
    },
  },
};

export default admin;
