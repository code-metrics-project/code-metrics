import { involvesPath } from "../involvesPath";
import { CompletePrInfo, PullRequest } from "../../../model/vcs";

describe("involvesPath", () => {
  it('should return the number and proportion of files that involved a change on a path including "/router"', () => {
    const prs = [
      {
        filesChanged: [
          {
            path: "/router/file1",
          },
          {
            path: "/another-path/router/file2",
          },
          {
            path: "/another-path/store/file3",
          },
        ],
        pr: {
          id: 1,
          title: "foo",
        },
      },
      {
        filesChanged: [
          {
            path: "/store/file1",
          },
          {
            path: "/another-path/router/file2",
          },
        ],
        pr: {
          id: 2,
          title: "foo",
        },
      },
      {
        filesChanged: [
          {
            path: "/store/file1",
          },
          {
            path: "/another-path/store/file2",
          },
        ],
        pr: {
          id: 3,
          title: "foo",
        },
      },
    ] as CompletePrInfo[];

    expect(involvesPath(prs, "/router")).toEqual({
      numberOfPrs: 3,
      numberThatMeetCriteria: 2,
      path: "/router",
      percentageThatMeetCriteria: "67%",
    });
  });
});
