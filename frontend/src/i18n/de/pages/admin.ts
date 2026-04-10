const admin = {
  admin: {
    title: "Administration",
    description:
      "Verwalten Sie die Einstellungen Ihrer Code Metrics-Instanz und administrative Aufgaben. Dieser Bereich bietet Werkzeuge für Systemadministration, Sicherheitsverwaltung und Servicekonfiguration.",
    cards: {
      tokens: {
        title: "Diensttoken",
        description: "Diensttoken für den API-Zugriff ausstellen, widerrufen und verwalten.",
        action: "Diensttoken verwalten",
      },
      datastores: {
        title: "Datenspeicher",
        description: "Physische Speichersammlungen und Tabellen anzeigen und verwalten.",
        action: "Datenspeicher verwalten",
      },
    },
    tokens: {
      title: "Diensttoken",
      description:
        "Verwalten Sie API-Diensttoken für automatisierte Systeme und Hintergrundprozesse. Diensttoken bieten sicheren, langfristigen Zugriff auf die CodeMetrics-API.",
      createButton: "Token erstellen",
      table: {
        title: "Aktive Diensttoken",
        subject: "Betreff",
        created: "Erstellt",
        expires: "Läuft ab",
        createdBy: "Erstellt von",
        actions: "Aktionen",
      },
      empty: {
        title: "Keine Diensttoken gefunden",
        description: "Erstellen Sie Ihr erstes Diensttoken, um mit dem API-Zugriff zu beginnen.",
      },
      createDialog: {
        title: "Diensttoken erstellen",
        subjectLabel: "Betreff/Servicename",
        subjectPlaceholder: "Beschreibenden Namen eingeben",
        subjectHelp: "Ein beschreibender Name für den Service oder die Anwendung, die dieses Token verwendet",
        successTitle: "Token erfolgreich erstellt",
        importantLabel: "Wichtig:",
        importantDescription: "Kopieren Sie dieses Token jetzt. Aus Sicherheitsgründen wird es nicht erneut angezeigt.",
        doneButton: "Fertig",
        cancelButton: "Abbrechen",
        submitButton: "Token erstellen",
      },
      revokeDialog: {
        title: "Diensttoken widerrufen?",
        confirmMessage: "Sind Sie sicher, dass Sie dieses Diensttoken widerrufen möchten?",
        subjectLabel: "Betreff",
        createdLabel: "Erstellt",
        warning:
          "Diese Aktion kann nicht rückgängig gemacht werden. Alle Systeme, die dieses Token nutzen, verlieren sofort den Zugriff.",
        cancelButton: "Abbrechen",
        submitButton: "Token widerrufen",
      },
      toast: {
        loadError: "Diensttoken konnten nicht geladen werden",
        createSuccess: "Diensttoken erfolgreich erstellt",
        createError: "Diensttoken konnte nicht erstellt werden",
        revokeSuccess: "Diensttoken erfolgreich widerrufen",
        revokeError: "Diensttoken konnte nicht widerrufen werden",
        copySuccess: "Token in die Zwischenablage kopiert",
      },
    },
    datastores: {
      title: "Datenspeicher",
      description:
        "Zeigen und verwalten Sie die physischen Speichersammlungen und Tabellen, die den Datenspeicher unterstützen. Dabei handelt es sich um die rohen Speicher-Engine-Entitäten (MongoDB-Collections, DynamoDB-Tabellen, NeDB-Dateien oder In-Memory-Buckets).",
      table: {
        title: "Sammlungen",
        name: "Name",
        actions: "Aktionen",
      },
      empty: {
        title: "Keine Sammlungen gefunden",
        description:
          "In der aktiven Speicher-Engine wurden keine physischen Speichersammlungen oder Tabellen gefunden.",
      },
      toast: {
        loadError: "Datenspeicher-Sammlungen konnten nicht geladen werden",
      },
      detail: {
        title: "Sammlungsdetails",
        nameLabel: "Sammlungsname",
        existsLabel: "Vorhanden",
        existsYes: "Ja",
        existsNo: "Nein",
        countButton: "Elemente zählen",
        countLabel: "Anzahl der Elemente",
        countNotChecked: "Nicht geprüft",
        emptyButton: "Sammlung leeren",
        emptyDialog: {
          title: "Sammlung leeren?",
          description: "Möchten Sie diese Sammlung wirklich leeren? Dadurch werden alle Elemente dauerhaft gelöscht.",
          warning: "Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten in dieser Sammlung gehen verloren.",
          cancelButton: "Abbrechen",
          submitButton: "Sammlung leeren",
        },
        toast: {
          existsError: "Das Vorhandensein der Sammlung konnte nicht geprüft werden",
          countError: "Die Elemente konnten nicht gezählt werden",
          emptySuccess: "Sammlung erfolgreich geleert",
          emptyError: "Die Sammlung konnte nicht geleert werden",
        },
      },
    },
  },
};

export default admin;
