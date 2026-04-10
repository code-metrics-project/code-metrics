const support = {
  appUnavailable: {
    title: "Couldn't reach the CodeMetrics API to fetch basic configuration.",
    description: "Please check the API is running and that the connection details are correct, then refresh the page.",
    action: "Refresh Page",
  },
  configMissing: {
    title: "Configuration Error",
    message:
      "The application configuration could not be loaded. This may be due to a network error or misconfigured backend. Please check the server logs and try again.",
  },
  licenseMissing: {
    title: "License Required",
    description: "A valid license is required to use Code Metrics",
    message: "Your Code Metrics installation does not have a valid license configured. Please contact your",
    administrator: "administrator",
  },
  notFound: {
    title: "Page Not Found",
    description: "The page you are looking for does not exist.",
  },
  unauthorised: {
    title: "Forbidden",
    description: "You don't have permission to access this page.",
  },
};

export default support;
