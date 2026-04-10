# Internationalisation (i18n)

CodeMetrics supports multiple languages through built-in internationalisation. Users can switch between languages using the language selector in the navigation bar.

## Supported Languages

| Language | Code | Native Name |
| -------- | ---- | ----------- |
| English  | `en` | English     |
| Japanese | `ja` | 日本語      |
| Spanish  | `es` | Español     |
| German   | `de` | Deutsch     |
| French   | `fr` | Français    |
| Welsh    | `cy` | Cymraeg     |

## Enabling the Language Selector

The language selector is controlled by a feature flag. To enable it, set the following environment variable:

```bash
FEATURE_LANGUAGE_SELECTOR=true
```

When enabled, a globe icon will appear in the navigation bar allowing users to switch between available languages.

## Language Persistence

The selected language is automatically persisted to the browser's `localStorage` under the key `i18nextLng`. When a user returns to the application, their previously selected language will be restored.

### Language Detection Order

1. **localStorage** - Previously saved language preference
2. **Browser language** - The user's browser language settings

If no saved preference exists, the application will attempt to match the browser's language. If no match is found, it defaults to English (`en`).

## Technical Details

### Translation Files

Translation files are organized by language code under `frontend/src/i18n/`:

```
src/i18n/
├── index.ts           # i18n configuration
├── en/                # English translations
│   ├── nav.ts         # Navigation labels
│   ├── common.ts      # Common UI elements
│   ├── pages.ts       # Page-specific content
│   ├── components.ts  # Component strings
│   └── buttons.ts     # Button labels
├── ja/                # Japanese translations
├── es/                # Spanish translations
├── de/                # German translations
├── fr/                # French translations
└── cy/                # Welsh translations
```

### Translation Namespaces

Translations are organized into namespaces for better maintainability:

| Namespace    | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| `nav`        | Navigation menu items and links                       |
| `common`     | Common UI elements (buttons, labels, status messages) |
| `pages`      | Page titles, descriptions, and content                |
| `components` | Reusable component strings                            |
| `buttons`    | Button labels and actions                             |

### Using Translations in Code

The application uses `react-i18next` for translations. Use the `useI18n` hook to access translations:

```tsx
import { useI18n } from "@/hooks/useI18n";

function MyComponent() {
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("pages:home.title")}</h1>
      <p>{t("common.loading")}</p>
    </div>
  );
}
```

### Translation Key Format

Translation keys follow the format `namespace:key.path`:

- `nav:home` - Navigation home link
- `common.loading` - Common loading message
- `pages:workload.title` - Workload page title
- `components.filters.startDate` - Start date filter label

### Interpolation

Dynamic values can be inserted using double curly braces:

```tsx
// Translation file
export default {
  found: "{{count}} repositories found",
};

// Usage
t("pages:repositories.found", { count: 42 });
// Output: "42 repositories found"
```

## Adding a New Language

To add a new language:

1. Create a new directory under `frontend/src/i18n/` with the language code (e.g., `it/` for Italian)

2. Create translation files for each namespace:
   - `nav.ts`
   - `common.ts`
   - `pages.ts`
   - `components.ts`
   - `buttons.ts`

3. Import and register the translations in `frontend/src/i18n/index.ts`:

```typescript
// Import the new language files
import itNav from "./it/nav";
import itCommon from "./it/common";
import itPages from "./it/pages";
import itComponents from "./it/components";
import itButtons from "./it/buttons";

// Add to resources
const resources = {
  // ... existing languages
  it: {
    nav: itNav,
    common: itCommon,
    pages: itPages,
    components: itComponents,
    buttons: itButtons,
  },
};

// Add to supportedLanguages
export const supportedLanguages = [
  // ... existing languages
  { code: "it", name: "Italiano", flag: "🇮🇹" },
] as const;

// Add to supportedLngs in init config
i18n.init({
  // ...
  supportedLngs: ["en", "ja", "es", "de", "fr", "cy", "it"],
});
```

## Fallback Behavior

If a translation key is missing in the selected language, the application will fall back to English (`en`). This ensures that users always see content, even if translations are incomplete.
