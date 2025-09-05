// generate_metadata.js
const fs = require("fs");
const { execSync } = require("child_process");
const metadata = {
  name: JSON.parse(execSync("npm pkg get name").toString()),
  version: JSON.parse(execSync("npm pkg get version").toString()),
};
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/metadata.json", JSON.stringify(metadata));
