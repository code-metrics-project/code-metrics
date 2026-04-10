interface BootstrapLoaderProps {
  timedOut: boolean;
}

export function BootstrapLoader({ timedOut }: BootstrapLoaderProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
      <div className="border-b border-neutral-200 bg-neutral-50/95 px-4 dark:border-neutral-700 dark:bg-neutral-800/95">
        <div className="flex h-16 items-center">
          <img className="h-8 w-auto" src="/assets/img/codemetrics_logo.png" alt="CodeMetrics logo" />
          <span className="ml-2 text-xl font-bold">CodeMetrics</span>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-24">
        {!timedOut && (
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-500" />
        )}
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          CodeMetrics is currently waiting for the backend services...
        </p>
        {timedOut && (
          <div
            role="alert"
            data-testid="bootstrap-timeout-alert"
            className="mt-6 w-full rounded-lg border-l-4 border-red-600 bg-white p-4 shadow-sm dark:bg-neutral-700"
          >
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Couldn&apos;t reach the CodeMetrics API to fetch basic configuration.
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Please check the API is running and that the connection details are correct, then refresh the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
