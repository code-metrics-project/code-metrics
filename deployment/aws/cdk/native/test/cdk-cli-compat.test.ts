import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { App, Stack } from "aws-cdk-lib";

// The deploy workflow runs this project's aws-cdk CLI against assemblies written by aws-cdk-lib,
// and the CLI refuses any cloud assembly schema version newer than it supports.
const cdkCli = require.resolve("aws-cdk/bin/cdk");
const STACK_NAME = "CliCompatStack";

function synthAssembly(): string {
  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "cdk-cli-compat-"));
  const app = new App({ outdir });
  new Stack(app, STACK_NAME);
  app.synth();
  return outdir;
}

function listStacks(assemblyDir: string) {
  return spawnSync(process.execPath, [cdkCli, "ls", "--app", assemblyDir, "--no-notices"], {
    cwd: assemblyDir,
    encoding: "utf8",
  });
}

describe("aws-cdk CLI compatibility", () => {
  let assemblyDir: string;

  beforeEach(() => {
    assemblyDir = synthAssembly();
  });

  afterEach(() => {
    fs.rmSync(assemblyDir, { recursive: true, force: true });
  });

  it("reads the cloud assembly produced by the installed aws-cdk-lib", () => {
    const result = listStacks(assemblyDir);

    expect(result.stderr).not.toMatch(/schema version mismatch/i);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(STACK_NAME);
  }, 60_000);

  it("rejects a cloud assembly with an unsupported schema version", () => {
    const manifestPath = path.join(assemblyDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, version: "999.0.0" }));

    const result = listStacks(assemblyDir);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/schema version mismatch/i);
  }, 60_000);
});
