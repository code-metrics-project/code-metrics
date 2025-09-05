# Standards and Patterns

This document outlines the coding standards, architectural patterns, and development norms for the Code Metrics project. It's split into sections for shared standards, backend-specific patterns, and UI-specific patterns, along with a review of how these standards are enforced.

## Shared Standards

### Release

- We use [Semantic Versioning](https://semver.org/). See the [release process](./release.md) for more details.

### Version Control

- We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages. Make sure to use the lowercase category names, e.g. `fix`, `feat`, `chore`, etc.
- Every commit should be atomic and self-contained. Avoid large commits that include multiple unrelated changes.
- Every commit should have a clear and descriptive commit message that explains the purpose of the change. If you prefer to work in branches with lots of 'WIP' commits, _you must_ squash them into a single commit before merging, or rewrite the commit history to make it clear what the change is about using conventional commit messages.
- We use [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow) for branching and merging. Create a new branch for each feature or bug fix, and open a pull request when you're ready to merge.
- We do not use merge commits.

### Code Style

- [Prettier](https://prettier.io/) is used for code formatting with a 120-character line length limit.
- 2-space indentation is standard across all files.
- Both backend and UI use ESLint with TypeScript support for static code analysis.
- Style is enforced automatically through linting scripts (`npm run lint` and `npm run lint:fix`).

### Metrics and Data

- All durations should be returned as seconds (and formatted in the UI).
- All dates should be UTC.
- Time-based data uses ISO date strings for standardisation.

### Testing Approach

- Tests are separated into groups: `unit`, `integration`, and `slow` for isolation and efficient CI runs.
- Unit tests can be run without external dependencies, while integration tests may require mocked services.
- Test files are co-located with source files in `__tests__` directories.
- Jest is used for backend testing, while Vitest with Vue Test Utils is used for UI component testing.
- E2E tests use Cypress and are separated from unit tests.

### Build and CI

- CI/CD is managed through GitHub Actions for testing, building, and releasing.
- Code coverage is tracked between builds with separate coverage reports for unit, integration, and slow tests.
- Coverage thresholds ensure code quality doesn't regress.

## Backend Standards and Patterns

### Architecture

- Service-oriented architecture with clear separation of concerns:
  - `/src/services/` - Core business logic organised by domain (codeManagement, projectManagement, etc.)
  - `/src/model/` - TypeScript interfaces and data models
  - `/src/routes/` - API route handlers
  - `/src/utils/` - Shared utility functions
  - `/src/config/` - Configuration loading and validation
  - `/src/db/` - Data persistence abstraction

### Service Registration Pattern

- Services follow a factory pattern with explicit registration for dependency injection:

```typescript
export const initAdoVcs = () => registerVcs(CodeManagementTypes.AZURE, () => new AdoVcsService());
```

- This enables runtime configuration of service implementation based on application needs.

### Datastore Abstraction

- Services use a datastore abstraction layer that provides caching and persistence:

```typescript
this.datastore = provideDatastore("ado-vcs", { ttlIfToday: 3600 });
```

- This standardises data access and provides configurable TTL-based caching.

### Error Handling

- Consistent error handling patterns with service-specific error types.
- Application uses verbose logging for diagnostic information, with different log levels.
- Service methods are responsible for catching their own exceptions and returning safe values.

### API Design

- RESTful API with resource-based routes.
- Route handlers are thin, delegating business logic to services.
- Query parameters are validated and sanitized before use.
- Responses are consistently formatted with standard error structures.

## UI Standards and Patterns

### Component Architecture

- Vue 3 Composition API is used for component design.
- Components follow a clear responsibility pattern:
  - Presentational components in `/components/`
  - Shared utilities in `/utils/`
  - Views/pages in `/views/`

### State Management

- Pinia is used for global state management.
- Vue Query (@tanstack/vue-query) is used for data fetching and cache management.
- Components derive state from stores rather than managing complex internal state.

### Component Design Principles

- Props are typed with explicit TypeScript interfaces.
- Events are defined with clear naming conventions and typed payloads.
- Components are designed to be reusable and composable.
- Business logic is extracted to composables or services.

### UI Framework and Styling

- Vuetify is used as the primary UI component framework.
- SCSS is used for styling with a consistent approach to variables and theming.
- Components maintain a consistent visual language through shared design tokens.
- Responsive design is implemented consistently across all views.

## Code Quality Enforcement

### Automated Checks

- ESLint and Prettier are enforced through pre-commit hooks and CI checks.
- TypeScript strict mode ensures type safety across the codebase.
- Circular dependency checks prevent architectural issues:

```bash
npm run circular-dependency-scan
```

### Performance Considerations

- Backend services use connection pooling and rate limiting (via Bottleneck) to prevent overwhelming external APIs.
- UI components avoid unnecessary re-renders through proper reactive design.
- Large data sets are paginated both at the API and UI level.
