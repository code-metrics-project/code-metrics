# Config Validator

This project provides a script to validate configuration files against JSON schemas. The script supports YAML configuration files for different types of configurations such as workload, remote, and pipeline.

## Installation

To install the dependencies, run:

```sh
npm install
```

## Usage

To validate a configuration file, run the script with the path to the configuration file as an argument:

```sh
node validate-config.js <path to config file>.yaml
```

### Examples

Validate a workload configuration file:

```sh
node validate-config.js /path/to/workload-config.yaml
```

Validate a remote configuration file:

```sh
node validate-config.js /path/to/remote-config.yaml
```

Validate a pipeline configuration file:

```sh
node validate-config.js /path/to/pipeline-config.yaml
```

## Configuration Types

The script infers the type of configuration file based on the file name:

- If the file name starts with `workload`, it is treated as a workload configuration.
- If the file name starts with `remote`, it is treated as a remote configuration.
- If the file name starts with `pipeline`, it is treated as a pipeline configuration.

## JSON Schemas

The JSON schemas for validation are located in the same directory as the script and are required in the script.

## License

This project is licensed under the MIT License.
