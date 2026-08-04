interface ErrorAlertPanelProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  headingLevel?: 1 | 2;
  testId?: string;
}

function WarningIcon() {
  return (
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
  );
}

export function ErrorAlertPanel({
  title,
  description,
  actionLabel,
  onAction,
  headingLevel = 1,
  testId,
}: ErrorAlertPanelProps) {
  const HeadingTag = headingLevel === 2 ? "h2" : "h1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div
        role="alert"
        data-testid={testId}
        className="w-full max-w-md rounded-lg border-l-4 border-red-500 bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <WarningIcon />
          </div>
          <div className="flex-1">
            <HeadingTag className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</HeadingTag>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            <button
              type="button"
              onClick={onAction}
              className="mt-4 inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
