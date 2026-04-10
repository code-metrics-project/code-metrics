/**
 * Standalone AppUnavailable component that renders when the app cannot connect to the backend.
 * This is rendered outside of the React Router and other providers.
 */
import { useTranslation } from "./hooks/useI18n";

export function AppUnavailable() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg border-l-4 border-red-500 bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("pages:appUnavailable.title")}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("pages:appUnavailable.description")}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              {t("pages:appUnavailable.action")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
