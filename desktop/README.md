# Code Metrics Desktop Application

This directory contains the Electron-based desktop application for Code Metrics.

## Local development

Start the desktop app in development mode using mocks.

```shell
# install external dependencies
npm run install:ext

# build backend and frontend dependencies, and bundle desktop app JS
npm run release:dev

# start mocks
imposter up -r ../mocks/

# pack the electron app and start it from the 'dist-build' directory
npm run dev:packed
```

## Build desktop app

To build the desktop app in production mode, you need to install external dependencies, build the backend and frontend, and then package the Electron app.

```shell
# install external dependencies
npm run install:ext

# build dependencies in production mode, bundle desktop app JS and pack the electron app
npm run dist:prod
```

See the `dist-build` directory for the built desktop app.

## Settings

When you first start the application, a settings screen will appear asking you to specify the path to your Code Metrics configuration directory. This is a required step before the application can start.

### Configuration Settings

- **Code Metrics Configuration Directory**: The directory containing your Code Metrics configuration files.

### How Settings Work

1. When you first launch the application, the settings screen will automatically appear if no configuration has been previously saved.
2. Enter the path to your configuration directory or use the "Browse" button to select it.
3. Click "Save Settings" to save your configuration and start the application.
4. The configuration path is stored in `~/.codemetrics/settings.json` (where `~` is your home directory).

### Settings File Location

The settings file is stored in the following location:

```
~/.codemetrics/settings.json
```

This file contains the path to your Code Metrics configuration directory.

## Troubleshooting

### Changing the Configuration Directory

If you need to change your configuration directory:

1. Launch the application
2. Close the main application window
3. Edit the settings file directly at `~/.codemetrics/settings.json` or delete it to reset the configuration
4. Restart the application

### Resetting Configuration

To completely reset the configuration:

```bash
# Remove the settings file
rm ~/.codemetrics/settings.json

# Alternatively, remove the entire .codemetrics directory
rm -rf ~/.codemetrics
```

After removing the settings file, the application will prompt you to set up a new configuration directory the next time it's launched.

### Common Issues

1. **Application quits immediately**: This may happen if the settings screen is closed without saving a configuration. Make sure to specify a valid configuration directory and click "Save Settings".

2. **Cannot find configuration files**: Ensure that the directory you specified actually contains the required Code Metrics configuration files.

3. **Permission errors**: Make sure the application has read and write permissions for both the specified configuration directory and the `~/.codemetrics` directory where settings are stored.
