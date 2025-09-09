# Running using Node.js directly

To run the API and web UI directly, you will need to install Node.js v20 or later.

Download the `codemetrics-api.zip` file and unzip it.

To start the API, run:

    node index.js

> The API runs at http://localhost:3000

The frontend web UI is a static site, so can be hosted anywhere. You can find the latest version of the web UI on the [Releases page](https://github.com/code-metrics-project/releases/releases).

Download the `codemetrics-ui.zip` file and unzip it. You will need to set the `apiBaseUrl` variable in `config.json` to point to the API endpoint.
