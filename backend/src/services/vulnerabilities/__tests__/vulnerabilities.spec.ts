import { extractRepoName } from "../vulnerabilities";
import { SarifRun } from "../../../model/vulnerabilities";

describe("vulnerability service", () => {
  it("extracts a repo name from a sarif file", () => {
    const run: SarifRun = {
      results: [],
      tool: { driver: { name: "" } },
      versionControlProvenance: [
        {
          repositoryUri: "https://github.com/example-corp/octorepo",
        },
      ],
    };
    const repoName = extractRepoName(run);
    expect(repoName).toBe("octorepo");
  });

  it("extracts a suffixed repo name from a sarif file", () => {
    const run: SarifRun = {
      results: [],
      tool: { driver: { name: "" } },
      versionControlProvenance: [
        {
          repositoryUri: "https://github.com/example-corp/octorepo.git",
        },
      ],
    };
    const repoName = extractRepoName(run);
    expect(repoName).toBe("octorepo");
  });

  it("returns null when there is no sarif repositoryUri", () => {
    const run: SarifRun = {
      results: [],
      tool: { driver: { name: "" } },
      versionControlProvenance: [],
    };
    const repoName = extractRepoName(run);
    expect(repoName).toBeNull();
  });
});
