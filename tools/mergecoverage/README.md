# Code Metrics Merge Coverage

A tool for merging LCOV coverage reports from multiple directories and generating HTML reports.

## Installation

Ensure you have Node.js installed. You can specify the Node.js version using the `.nvmrc` file.

```sh
nvm use
npm install
```

## Usage

To merge coverage reports and generate an HTML report, first run all required testing scripts within the relevant code packages and producing `json` format coverage reports.

Once completed, to execute this report merging tool, run the following command:

```sh
npm run merge-coverage-json [directories]
```

- `directories` (optional): Comma-separated list of directories to search for coverage reports. Defaults to `../../backend,../../ui`.

Example:

```sh
npm run merge-coverage-json "../../backend,../../ui"
```

## Project Structure

- `merge-coverage-json.js`: Main script for merging coverage reports and generating HTML reports.
- `package.json`: Project configuration and dependencies.
- `.nvmrc`: Specifies the Node.js version to use.
