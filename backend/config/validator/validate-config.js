const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv();
addFormats(ajv);

const schemas = {
  workload: require("./workload-config.schema.json"),
  remote: require("./remote-config.schema.json"),
  pipeline: require("./pipeline-config.schema.json"),
  "quality-gates": require("./quality-gates-config.schema.json"),
};

function loadConfig(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".yaml" || ext === ".yml" || ext === ".json") {
    return yaml.load(fs.readFileSync(filePath, "utf8"));
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }
}

function validateConfig(config, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(config);
  if (!valid) {
    console.error("Validation errors:", validate.errors);
    process.exit(1);
  }
  console.log("Validation successful");
}

function inferConfigType(fileName) {
  if (fileName.startsWith("workload")) {
    return "workload";
  } else if (fileName.startsWith("remote")) {
    return "remote";
  } else if (fileName.startsWith("pipeline")) {
    return "pipeline";
  } else if (fileName.startsWith("quality-gates")) {
    return "quality-gates";
  } else {
    throw new Error(`Unknown config type for file: ${fileName}`);
  }
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a path to the config file.");
    process.exit(1);
  }

  const config = loadConfig(filePath);
  const configType = inferConfigType(path.basename(filePath));
  validateConfig(config, schemas[configType]);
}

main();
