// Make the Lambda asset self-contained: CDK zips dist/ as-is, so copy the
// runtime dependencies into dist/node_modules (the handler requires the AWS
// SDK at runtime and Lambda cannot resolve it from outside the package).
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const distNodeModules = path.join(distDir, "node_modules");
const srcNodeModules = path.join(__dirname, "..", "node_modules");

fs.rmSync(distNodeModules, { recursive: true, force: true });
fs.cpSync(srcNodeModules, distNodeModules, { recursive: true });

console.log(`Copied runtime dependencies into ${path.relative(process.cwd(), distNodeModules)}`);
