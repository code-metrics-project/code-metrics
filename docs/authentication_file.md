# File-based Authentication

## Introduction

Code Metrics supports file-based authentication. This is a simple authentication mechanism where the user's credentials are stored in a file on the server.

## Configuration

Set the environment variable:

```
AUTHENTICATOR_IMPL=file
```

This authenticator reads a file named `users.json` in your config directory.

The file is a simple key/value map.

```json
[
  {
    "name": "admin",
    "password": "1253509b718dbbeafa4e028afc9a5f667fe17881fdd222e31559ae452029c3a0fe24075565673a9d9ccfd4564bf1a2b9374243ee19b9846256a9b0e260ea0bc0",
    "salt": "0c62b823eb5b9699ff48c1d0c93816d0"
  }
]
```

Copy the example file `users.json.example` to get started.

### The `userconfig` tool

You can generate entries for the `users.json` using the `userconfig` tool under `tools`.

<details>
<summary>Usage instructions for `userconfig` tool</summary>

Usage:

```
npm run start -- --username <username> --salt <salt>
```

> Note the double dash (`--`) before the arguments when running using `npm`.

If a username and salt are provided, the tool prompts for a password:

```shell
$ npm run start -- -u jane -s somesaltvalue

Set password for jane:
```

Once you type the password, the configuration is generated as follows:

```json
{
  "name": "jane",
  "password": "0f7dee0b90c2e0c1342393153b319d79c421da0ec10248b90a24ea7b78265dc4480d0434fecd3d3b75e7ab7ad221a1f15290ba8b76cd3385ad28e847ecec69ac",
  "salt": "somesaltvalue"
}
```
</details>
