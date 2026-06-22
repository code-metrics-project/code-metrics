const admin = {
  admin: {
    title: "Administration",
    description:
      "Manage your Code Metrics instance settings and administrative tasks. This section provides tools for system administration, security management, and service configuration.",
    cards: {
      tokens: {
        title: "Service Tokens",
        description: "Issue, revoke and manage service tokens for access to the API.",
        action: "Manage Service Tokens",
      },
      datastores: {
        title: "Data Stores",
        description: "View and manage physical storage collections and tables.",
        action: "Manage Data Stores",
      },
      remoteConnections: {
        title: "Remote Connections",
        description: "View connection status for all configured remote servers and services.",
        action: "View Connections",
      },
    },
    tokens: {
      title: "Service Tokens",
      description:
        "Manage API service tokens for automated systems and background processes. Service tokens provide secure, long-lived access to the CodeMetrics API.",
      createButton: "Create Token",
      table: {
        title: "Active Service Tokens",
        subject: "Subject",
        created: "Created",
        expires: "Expires",
        createdBy: "Created By",
        actions: "Actions",
      },
      empty: {
        title: "No service tokens found",
        description: "Create your first service token to get started with API access.",
      },
      createDialog: {
        title: "Create Service Token",
        subjectLabel: "Subject/Service Name",
        subjectPlaceholder: "Enter a descriptive name",
        subjectHelp: "A descriptive name for the service or application that will use this token",
        successTitle: "Token created successfully",
        importantLabel: "Important:",
        importantDescription: "Copy this token now. For security reasons, it won't be shown again.",
        doneButton: "Done",
        cancelButton: "Cancel",
        submitButton: "Create Token",
      },
      revokeDialog: {
        title: "Revoke Service Token?",
        confirmMessage: "Are you sure you want to revoke this service token?",
        subjectLabel: "Subject",
        createdLabel: "Created",
        warning: "This action cannot be undone. Any systems using this token will lose access immediately.",
        cancelButton: "Cancel",
        submitButton: "Revoke Token",
      },
      toast: {
        loadError: "Failed to load service tokens",
        createSuccess: "Service token created successfully",
        createError: "Failed to create service token",
        revokeSuccess: "Service token revoked successfully",
        revokeError: "Failed to revoke service token",
        copySuccess: "Token copied to clipboard",
      },
    },
    datastores: {
      title: "Data Stores",
      description:
        "View and manage the physical storage collections and tables backing the datastore. These are the raw storage engine entities (MongoDB collections, DynamoDB tables, NeDB files, or in-memory buckets).",
      table: {
        title: "Collections",
        name: "Name",
        actions: "Actions",
      },
      empty: {
        title: "No collections found",
        description: "No physical storage collections or tables were found in the active storage engine.",
      },
      toast: {
        loadError: "Failed to load datastore collections",
      },
      detail: {
        title: "Collection Detail",
        nameLabel: "Collection Name",
        existsLabel: "Exists",
        existsYes: "Yes",
        existsNo: "No",
        countButton: "Count Items",
        countLabel: "Item Count",
        countNotChecked: "Not checked",
        emptyButton: "Empty Collection",
        emptyDialog: {
          title: "Empty Collection?",
          description: "Are you sure you want to empty this collection? This will permanently delete all items.",
          warning: "This action cannot be undone. All data in this collection will be lost.",
          cancelButton: "Cancel",
          submitButton: "Empty Collection",
        },
        toast: {
          existsError: "Failed to check collection existence",
          countError: "Failed to count items",
          emptySuccess: "Collection emptied successfully",
          emptyError: "Failed to empty collection",
        },
      },
    },
    remoteConnections: {
      title: "Remote Connections",
      description:
        "Check connectivity to all configured remote servers and services. This dashboard displays real-time connection status for version control, pipelines, code analysis, ticket management, and LLM services.",
      refresh: "Refresh",
      lastChecked: "Last checked",
      table: {
        title: "Connection Status",
        serverId: "Server ID",
        category: "Category",
        type: "Type",
        url: "URL",
        status: "Status",
        detail: "Detail",
        responseTime: "Response Time",
      },
      status: {
        connected: "Connected",
        unreachable: "Unreachable",
        unauthorised: "Unauthorised",
        error: "Error",
        unconfigured: "Unconfigured",
        rateLimited: "Rate Limited",
      },
      empty: {
        title: "No remote connections configured",
        description: "Configure remote servers in your remote-config.yaml file to see connection status.",
      },
      toast: {
        loadError: "Failed to check remote connections",
      },
    },
  },
};

export default admin;
