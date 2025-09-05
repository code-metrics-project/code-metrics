# Desktop Application

Code Metrics can be run as a desktop application. This enables you to use the tool without the need to set up a server or utilise a web browser.
It expects its licence file and configuration file to be located in the directory `~/.config/code-metrics`.

## Installation

### Linux

The desktop application is available as an `AppImage` or `.tar.gz` package.

### Windows

The desktop application is available as an `MSI` package.

### macOS

The desktop application is available as a `DMG` or `.zip` package.

### Environment Variables

The desktop application uses the same environment variables as the server application. Refer to [Environment variables](./env_vars.md) for further information.

The following environment variables used to configure the desktop application, of which some are relevant outside of development:

**Development Environment Variables:**
- `NODE_ENV`: `development|production` — *default: production* — Specifies the environment in which the application runs.
- `DEBUG`: `true|false` — *default: false* — Enables a debugger to be attached to the backend application.

**User Environment Variables:**
- `SHOW_CONSOLE`: `true|false` — *default: true* — Displays the console window. This is useful for debugging the application.

## Development

The desktop application is built using Electron and React. The source code is located in the `desktop` directory.
