import * as path from "path";
import * as fs from "fs";
import * as YAML from "yaml";

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const makefilePath = path.join(repoRoot, "deployment", "Makefile");
const workflowPath = path.join(repoRoot, ".github", "workflows", "deploy-demo.yaml");

// imposter-go dropped query parameters from API Gateway and Function URL events
// before this release: https://github.com/imposter-project/imposter-go/issues/96
const MINIMUM_IMPOSTER_GO_VERSION = [5, 21, 1];

// The public downstream mirror does not sync deploy-demo.yaml, and its CI sets this to "false".
function demoWorkflowsAvailable(env: NodeJS.ProcessEnv): boolean {
  return env.DEMO_WORKFLOWS_AVAILABLE?.trim().toLowerCase() !== "false";
}

const describeDemoWorkflow = demoWorkflowsAvailable(process.env) ? describe : describe.skip;

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

describe("demoWorkflowsAvailable", () => {
  it("defaults to true when the variable is unset", () => {
    expect(demoWorkflowsAvailable({})).toBe(true);
  });

  it("is true when CI reports the demo workflows are present", () => {
    expect(demoWorkflowsAvailable({ DEMO_WORKFLOWS_AVAILABLE: "true" })).toBe(true);
  });

  it("is false when CI reports the demo workflows are absent", () => {
    expect(demoWorkflowsAvailable({ DEMO_WORKFLOWS_AVAILABLE: "false" })).toBe(false);
    expect(demoWorkflowsAvailable({ DEMO_WORKFLOWS_AVAILABLE: " FALSE " })).toBe(false);
  });
});

describe("Imposter Go Lambda package build", () => {
  const makefile = fs.readFileSync(makefilePath, "utf8");

  it("pins an imposter-go version that forwards Lambda query parameters", () => {
    const makefileVersion = /^IMPOSTER_GO_VERSION\s*:=\s*(\S+)$/m.exec(makefile)?.[1] as string;

    expect(isAtLeast(parseVersion(makefileVersion), MINIMUM_IMPOSTER_GO_VERSION)).toBe(true);
  });

  it("assembles the Lambda package from released artefacts rather than building from source", () => {
    expect(makefile).not.toMatch(/git clone/);
    expect(makefile).not.toMatch(/git apply/);
    expect(makefile).not.toMatch(/go build/);
    expect(makefile).not.toMatch(/imposter-go-lambda-query-params\.patch/);
    expect(makefile).toMatch(/build-imposter-go-lambda:\s*get-imposter-go\s+get-imposter-go-plugins/);
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
  });

  describeDemoWorkflow("deploy-demo workflow", () => {
    // Jest still runs skipped describe bodies, so the read must wait for beforeAll.
    let workflow: string;

    beforeAll(() => {
      workflow = fs.readFileSync(workflowPath, "utf8");
    });

    it("pins the same imposter-go version in the Makefile and the deploy workflow", () => {
      const makefileVersion = /^IMPOSTER_GO_VERSION\s*:=\s*(\S+)$/m.exec(makefile)?.[1];
      // Read the value through the YAML parser so the assertion is not tied to quote style.
      const workflowVersion = YAML.parse(workflow)?.env?.IMPOSTER_GO_VERSION;

      expect(makefileVersion).toBeDefined();
      expect(workflowVersion).toBeDefined();
      expect(workflowVersion).toEqual(makefileVersion);
    });

    it("assembles the Lambda package from released artefacts rather than building from source", () => {
      expect(workflow).not.toMatch(/git clone/);
      expect(workflow).not.toMatch(/git apply/);
      expect(workflow).not.toMatch(/go build/);
      expect(workflow).not.toMatch(/imposter-go-lambda-query-params\.patch/);
      expect(workflow).toMatch(/releases\/download\/v\$\{IMPOSTER_GO_VERSION\}\/imposter-go_linux_amd64\.tar\.gz/);
    });

    it("does not install a Go toolchain in the deploy workflow", () => {
      expect(workflow).not.toMatch(/actions\/setup-go/);
    });

    it("keeps the deployed artefact layout expected by the mocks stack", () => {
      expect(workflow).toMatch(/cp dist\/bootstrap dist\/imposter-go-lambda\//);
      expect(workflow).toMatch(/mkdir -p dist\/imposter-go-lambda\/config dist\/imposter-go-lambda\/plugins/);
    });
  });
});
