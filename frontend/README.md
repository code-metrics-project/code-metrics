# CodeMetrics Frontend (React)

React + TypeScript + Tailwind CSS + Vite UI app for CodeMetrics.

## Tooling

### Bun (package manager + runner)

This project uses Bun for installs and scripts. Prefer Bun over npm/yarn/pnpm for consistency and CI parity.

- Install dependencies: `bun install`
- Run scripts: `bun run <script>` (examples below)

> Comment: Bun is used for faster installs and a single lockfile (`bun.lock`). Node is still required by some tooling (Playwright), but scripts should be executed through Bun.

### ESLint (current setup)

ESLint uses flat config in [eslint.config.js](eslint.config.js). The setup includes:

- **TypeScript parser** (`typescript-eslint`) with standard recommended rules.
- **React + JSX A11y** rules via `eslint-plugin-react` and `eslint-plugin-jsx-a11y`.
- **React Hooks** and **React Refresh** rules for proper hook usage and HMR safety.
- **Tailwind v4 canonicalization** using `eslint-plugin-tailwind-canonical-classes` with `cssPath` set to `./src/index.css`.

Key scripts:

- `bun run lint` — ESLint check for `src/`
- `bun run lint:fix` — auto-fix lint issues where possible

If you need type-aware rules, update the config to use `typescript-eslint` type-checked presets and point at a dedicated tsconfig (for example, `tsconfig.eslint.json`).

### Prettier

Formatting is configured in [ .prettierrc.mjs ](.prettierrc.mjs) and includes `prettier-plugin-tailwindcss`.

- `bun run fmt` — check formatting
- `bun run fmt:fix` — apply formatting

## Development

- `bun run dev` — start Vite dev server
- `bun run build` — type-check and build
- `bun run preview` — preview production build

## Testing

- Playwright E2E docs and coverage flow: [__tests__/playwright/README.md](__tests__/playwright/README.md)
- Most-used E2E coverage command: `bun run test:e2e:coverage`
