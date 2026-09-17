import * as path from "path";
import * as fs from "fs";
import * as YAML from "yaml";

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const makefilePath = path.join(repoRoot, "deployment", "Makefile");
const workflowPath = path.join(repoRoot, ".github", "workflows", "deploy-demo.yaml");

// imposter-go dropped query parameters from API Gateway and Function URL events
// before this release: https://github.com/imposter-project/imposter-go/issues/96
const MINIMUM_IMPOSTER_GO_VERSION = [5, 21, 1];

function parseVersion(raw: string): number[] {
  const parts = raw.split(".").map((part) => Number(part));
  expect(parts).toHaveLength(3);
  for (const part of parts) {
    expect(Number.isFinite(part)).toBe(true);
  }
  return parts;
}

function isAtLeast(actual: number[], minimum: number[]): boolean {
  for (let i = 0; i < minimum.length; i++) {
    if (actual[i] > minimum[i]) {
      return true;
    }
    if (actual[i] < minimum[i]) {
      return false;
    }
  }
  return true;
}

describe("Imposter Go Lambda package build", () => {
  const makefile = fs.readFileSync(makefilePath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");

  it("pins the same imposter-go version in the Makefile and the deploy workflow", () => {
    const makefileVersion = /^IMPOSTER_GO_VERSION\s*:=\s*(\S+)$/m.exec(makefile)?.[1];
    // Read the value through the YAML parser so the assertion is not tied to quote style.
    const workflowVersion = YAML.parse(workflow)?.env?.IMPOSTER_GO_VERSION;

    expect(makefileVersion).toBeDefined();
    expect(workflowVersion).toBeDefined();
    expect(workflowVersion).toEqual(makefileVersion);
  });

  it("pins an imposter-go version that forwards Lambda query parameters", () => {
    const makefileVersion = /^IMPOSTER_GO_VERSION\s*:=\s*(\S+)$/m.exec(makefile)?.[1] as string;

    expect(isAtLeast(parseVersion(makefileVersion), MINIMUM_IMPOSTER_GO_VERSION)).toBe(true);
  });

  it("assembles the Lambda package from released artefacts rather than building from source", () => {
    for (const contents of [makefile, workflow]) {
      expect(contents).not.toMatch(/git clone/);
      expect(contents).not.toMatch(/git apply/);
      expect(contents).not.toMatch(/go build/);
      expect(contents).not.toMatch(/imposter-go-lambda-query-params\.patch/);
    }

    expect(makefile).toMatch(/build-imposter-go-lambda:\s*get-imposter-go\s+get-imposter-go-plugins/);
    expect(workflow).toMatch(/releases\/download\/v\$\{IMPOSTER_GO_VERSION\}\/imposter-go_linux_amd64\.tar\.gz/);
  });

  it("does not install a Go toolchain in the deploy workflow", () => {
    expect(workflow).not.toMatch(/actions\/setup-go/);
  });

  it("no longer carries the imposter-go source patch", () => {
    expect(fs.existsSync(path.join(repoRoot, "deployment", "patches"))).toBe(false);
  });

  it("keeps the deployed artefact layout expected by the mocks stack", () => {
    const configPath = path.join(repoRoot, "deployment", "aws", "cdk", "mocks", "config.yaml");
    const config = YAML.parse(fs.readFileSync(configPath, "utf8"));

    expect(config.mocks.lambdaAssetPath).toBe("../../../dist/imposter-go-lambda");

    // bootstrap binary plus plugins/ and config/ directories inside the asset dir
    expect(makefile).toMatch(/cp dist\/bootstrap \$\(IMPOSTER_GO_LAMBDA_DIR\)\//);
    expect(makefile).toMatch(/\$\(IMPOSTER_GO_LAMBDA_DIR\)\/config \$\(IMPOSTER_GO_LAMBDA_DIR\)\/plugins/);
    expect(workflow).toMatch(/cp dist\/bootstrap dist\/imposter-go-lambda\//);
    expect(workflow).toMatch(/mkdir -p dist\/imposter-go-lambda\/config dist\/imposter-go-lambda\/plugins/);
  });
});
