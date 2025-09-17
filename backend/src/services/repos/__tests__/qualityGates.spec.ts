import { enrichManifest } from "../qualityGates";

describe("Enrich manifest", () => {
  it("...", () => {
    const result = enrichManifest(
      "alpha",
      "https://alpha.com",
      {
        $schema: "https://github.com/octocat/quality-gates/tree/v0.1.0/schemas/schema.json",
        services: [
          {
            "service-tag": "athena_ui_subject_portal",
            "quality-gates": [
              {
                "check-types": ["code style and linting"],
                provider: "GitHub",
                phase: "pre-merge",
                config: {
                  file: ".github/workflows/pre-commit.yml",
                  path: "jobs.pre-commit",
                  name: "Run pre-commit",
                },
              },
            ],
          },
          {
            "service-tag": "beta_ui_subject_portal",
            "quality-gates": [
              {
                "check-types": ["code style and linting"],
                provider: "GitHub",
                phase: "pre-merge",
                config: {
                  file: ".github/workflows/pre-commit.yml",
                  path: "jobs.pre-commit",
                  name: "Run pre-commit 2",
                },
              },
            ],
          },
        ],
      },
      [
        {
          id: 12345,
          name: "Run pre-commit",
        },
      ],
      {
        id: "quality-gates",
        version: "v0.1.0",
        gates: ["code style and linting", "other"],
        environments: ["pre-merge", "other"],
      },
    );

    expect(result).toEqual({
      repo: "alpha",
      repoLink: "https://alpha.com",
      services: [
        {
          "service-tag": "athena_ui_subject_portal",
          "quality-gates": {
            "code style and linting": [
              {
                phase: "pre-merge",
                gates: [
                  {
                    "check-types": ["code style and linting"],
                    provider: "GitHub",
                    phase: "pre-merge",
                    config: {
                      file: ".github/workflows/pre-commit.yml",
                      path: "jobs.pre-commit",
                      name: "Run pre-commit",
                    },
                    isRequiredStatusCheck: true,
                  },
                ],
              },
              { phase: "other", gates: [] },
            ],
            other: [
              { phase: "pre-merge", gates: [] },
              { phase: "other", gates: [] },
            ],
          },
        },
        {
          "service-tag": "beta_ui_subject_portal",
          "quality-gates": {
            "code style and linting": [
              {
                phase: "pre-merge",
                gates: [
                  {
                    "check-types": ["code style and linting"],
                    provider: "GitHub",
                    phase: "pre-merge",
                    config: {
                      file: ".github/workflows/pre-commit.yml",
                      path: "jobs.pre-commit",
                      name: "Run pre-commit 2",
                    },
                    isRequiredStatusCheck: false,
                  },
                ],
              },
              { phase: "other", gates: [] },
            ],
            other: [
              { phase: "pre-merge", gates: [] },
              { phase: "other", gates: [] },
            ],
          },
        },
      ],
    });
  });
});
