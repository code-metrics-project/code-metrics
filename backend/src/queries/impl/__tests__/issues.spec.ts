import { groupIssues } from "../issues";

// stub out the unneeded fetch dependency
jest.mock("node-fetch", () => ({}));

describe("groupIssues", () => {
  it("aggregates data by day", () => {
    const issues = [
      {
        key: "ABC-100",
        created: "2022-08-10",
        priority: "Medium",
        workload: "teamA",
        issueDate: null,
        issueType: null,
        resolutiondate: null,
        title: null,
      },
      {
        key: "ABC-101",
        created: "2022-08-11",
        priority: "Medium",
        workload: "teamA",
        issueDate: null,
        issueType: null,
        resolutiondate: null,
        title: null,
      },
      {
        key: "ABC-102",
        created: "2022-08-11",
        priority: "Medium",
        workload: "teamA",
        issueDate: null,
        issueType: null,
        resolutiondate: null,
        title: null,
      },
    ];

    const grouped = groupIssues(issues, "escaped-bugs");
    expect(grouped.size).toBe(2);

    const day1 = grouped.get("2022-08-10");
    expect(day1?.["escaped-bugs"]?.length).toBe(1);
    const day1teamA = day1?.["escaped-bugs"]?.find((b) => b.dimensions.workloadId === "teamA");
    expect(day1teamA.value).toBe(1);

    const day2 = grouped.get("2022-08-11");
    expect(day2?.["escaped-bugs"]?.length).toBe(1);
    const day2teamA = day2?.["escaped-bugs"]?.find((b) => b.dimensions.workloadId === "teamA");
    expect(day2teamA.value).toBe(2);
  });

  it("interpolates a missing day as zero", () => {
    const issues = [
      {
        key: "ABC-100",
        created: "2022-08-10",
        priority: "Medium",
        workload: "teamA",
        issueDate: null,
        issueType: null,
        resolutiondate: null,
        title: null,
      },
      {
        key: "ABC-101",
        created: "2022-08-12",
        priority: "Medium",
        workload: "teamA",
        issueDate: null,
        issueType: null,
        resolutiondate: null,
        title: null,
      },
    ];

    const grouped = groupIssues(issues, "escaped-bugs");
    expect(grouped.size).toBe(3);

    const day1 = grouped.get("2022-08-10");
    expect(day1?.["escaped-bugs"]?.length).toBe(1);
    const day1teamA = day1?.["escaped-bugs"]?.find((b) => b.dimensions.workloadId === "teamA");
    expect(day1teamA.value).toBe(1);

    // interpolated day should have value 0
    const day2 = grouped.get("2022-08-11");
    expect(day2?.["escaped-bugs"]?.length).toBe(1);
    const day2teamA = day2?.["escaped-bugs"]?.find((b) => b.dimensions.workloadId === "teamA");
    expect(day2teamA.value).toBe(0);
  });
});
