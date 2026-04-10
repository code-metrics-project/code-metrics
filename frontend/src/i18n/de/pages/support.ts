const support = {
  appUnavailable: {
    title: "Die CodeMetrics-API konnte nicht erreicht werden, um die Grundkonfiguration abzurufen.",
    description:
      "Stellen Sie sicher, dass die API läuft und die Verbindungsdaten korrekt sind, und aktualisieren Sie anschließend die Seite.",
    action: "Seite aktualisieren",
  },
  configMissing: {
    title: "Konfigurationsfehler",
    message:
      "Die Anwendungskonfiguration konnte nicht geladen werden. Dies kann an einem Netzwerkfehler oder einer falsch konfigurierten Backend liegen. Bitte überprüfen Sie die Server-Logs und versuchen Sie es erneut.",
  },
  licenseMissing: {
    title: "Lizenz erforderlich",
    description: "Eine gültige Lizenz ist für die Nutzung von Code Metrics erforderlich",
    message: "Ihre Code Metrics-Installation hat keine gültige Lizenz konfiguriert. Bitte kontaktieren Sie Ihren",
    administrator: "Administrator",
  },
  notFound: {
    title: "Seite nicht gefunden",
    description: "Die gesuchte Seite existiert nicht.",
  },
  unauthorised: {
    title: "Zugriff verweigert",
    description: "Sie haben keine Berechtigung, auf diese Seite zuzugreifen.",
  },
};

export default support;
