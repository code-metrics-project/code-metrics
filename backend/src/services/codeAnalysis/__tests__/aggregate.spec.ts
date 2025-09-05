import { testables } from "../aggregate";

describe("sonar metric aggregation", () => {
  it("should create valid coverage response", () => {
    const componentData = [
      {
        analysisKey: { key: "key1", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
      {
        analysisKey: { key: "key2", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
    ];
    const result = testables.convertToCoverageResponse("workloadId", componentData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "workloadId/key1",
      workloadId: "workloadId",
      numProjects: 1,
      summary: {
        analysisKey: { key: "key1", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
      analysisLinks: [{ title: "key1", repoName: "repo", url: "http://example.com" }],
    });
    expect(result[1]).toEqual({
      name: "workloadId/key2",
      workloadId: "workloadId",
      numProjects: 1,
      summary: {
        analysisKey: { key: "key2", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
      analysisLinks: [{ title: "key2", repoName: "repo", url: "http://example.com" }],
    });
  });

  it("should aggregate metrics by repo group", () => {
    const componentData = [
      {
        analysisKey: { key: "key1", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
      {
        analysisKey: { key: "key2", repoName: "repo" },
        totalLinesToCover: 10,
        coverage: 0.5,
        totalLines: 100,
        analysisLink: "http://example.com",
      },
    ];
    const result = testables.aggregateCoverageForRepoGroup(componentData, "workloadId", "frontend");

    expect(result).toEqual([
      {
        analysisLinks: [
          {
            repoName: "repo",
            title: "key1",
            url: "http://example.com",
          },
          {
            repoName: "repo",
            title: "key2",
            url: "http://example.com",
          },
        ],
        name: "workloadId/frontend",
        numProjects: 2,
        summary: { coverage: 0.5, totalLines: 200, totalLinesToCover: 20 },
        workloadId: "workloadId",
      },
    ]);
  });
});
