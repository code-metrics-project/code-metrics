// Polyfill for random.uuid() - required in Docker environment
var random = typeof random !== "undefined" ? random : undefined;
if (!random) {
  random = {
    uuid: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  };
}

const MILLIS_PER_HOUR = 1000 * 3600;
const now = new Date();

const { projectName: adoProjectName, repoName } = context.request.pathParams;

// Pagination parameters
const skip = parseInt(context.request.queryParams["$skip"] || "0", 10);
const top = parseInt(context.request.queryParams["$top"] || "100", 10);

// See jira/search mock re matching ticket naming and numbering
const jiraProjectName = "DEV";
let startingJiraId = 10000;

let prs = [];

// approx 1 year of history
const start = new Date(now.getTime() - MILLIS_PER_HOUR * 24 * 365);
for (let current = start; current < now; current = new Date(current.getTime() + MILLIS_PER_HOUR * 24)) {
  prs = prs.concat(generatePrs(current));
}

// Apply pagination
const totalCount = prs.length;
const paginatedPrs = prs.slice(skip, skip + top);

const response = {
  count: paginatedPrs.length,
  value: paginatedPrs,
};

console.debug(
  `Generated ${totalCount} total PRs, returning ${paginatedPrs.length} (skip=${skip}, top=${top}) for ${adoProjectName}/${repoName}`
);
respond().withData(JSON.stringify(response));

function generatePrs(date) {
  const prs = [];
  const prCount = getPrCount(date);

  // Arrays of varied PR data
  const prTypes = [
    { prefix: "feat", action: "Add", component: "feature" },
    { prefix: "fix", action: "Fix", component: "bug" },
    { prefix: "refactor", action: "Refactor", component: "improvement" },
    { prefix: "perf", action: "Optimize", component: "performance" },
    { prefix: "docs", action: "Update", component: "documentation" },
    { prefix: "test", action: "Add", component: "test coverage" },
  ];

  const features = [
    "user authentication flow",
    "payment gateway integration",
    "email notification system",
    "dashboard analytics",
    "file upload functionality",
    "search and filtering",
    "data export feature",
    "user profile management",
    "admin panel controls",
    "reporting system",
    "API rate limiting",
    "caching mechanism",
    "error logging",
    "session management",
    "two-factor authentication",
  ];

  const authors = [
    { name: "Ada Lovelace", email: "ada.lovelace@example.com", id: "a81d76f6-9ef1-672f-a48d-44a1d01cd794" },
    { name: "Grace Hopper", email: "grace.hopper@example.com", id: "5a94f22f-f823-68db-bed4-14d5d637dc9e" },
    { name: "Alan Turing", email: "alan.turing@example.com", id: "c625dfaf-5d88-69f2-9609-82dfb9dd20fe" },
    { name: "Margaret Hamilton", email: "margaret.hamilton@example.com", id: "b912cc64-ca78-4784-aac1-491e615d019b" },
  ];

  for (let i = 0; i < prCount; i++) {
    const openHours = Math.round(randomInNormalDist() * 35) + 1;

    // 9 AM
    const creationDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9, 0));
    const closedDate = new Date(creationDate.getTime() + Math.round(MILLIS_PER_HOUR * openHours));

    const commitId1 = random.uuid();
    const commitId2 = random.uuid();
    const commitId3 = random.uuid();
    const pullRequestId = Math.round(Math.random() * 30000);

    const jiraIssueId = (++startingJiraId).toString();

    // Generate varied PR content
    const prType = prTypes[Math.floor(Math.random() * prTypes.length)];
    const feature = features[Math.floor(Math.random() * features.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];

    const prTitle = `${prType.action} ${feature}`;
    const prDescription = `This PR ${prType.action.toLowerCase()}s ${feature}. See ${jiraProjectName}-${jiraIssueId} for more details.`;
    const branchName = `${prType.prefix}/${jiraProjectName}-${jiraIssueId}-${feature.replace(/\s+/g, "-")}`;
    const commitMessage = `${prType.action} ${feature} for ${jiraProjectName}-${jiraIssueId}`;

    prs.push({
      repository: {
        id: "950a0d06-bc5d-4512-8334-498c024d161e",
        name: repoName,
        url: "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e",
        project: {
          id: "019f028e-3986-4a03-b572-b9a154cd9218",
          name: adoProjectName,
          state: "unchanged",
          visibility: "unchanged",
          lastUpdateTime: "0001-01-01T00:00:00",
        },
      },
      pullRequestId: pullRequestId,
      codeReviewId: pullRequestId,
      status: "completed",
      createdBy: {
        displayName: author.name,
        url: `\${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/${author.id}`,
        _links: {
          avatar: {
            href: `\${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.${author.id}`,
          },
        },
        id: author.id,
        uniqueName: author.email,
        imageUrl: `\${system.server.url}/_api/_common/identityImage?id=${author.id}`,
        descriptor: `aad.${author.id}`,
      },
      creationDate: creationDate.toISOString(),
      closedDate: closedDate.toISOString(),
      title: `${jiraProjectName}-${jiraIssueId} ${prTitle}`,
      description: prDescription,
      sourceRefName: `refs/heads/${branchName}`,
      targetRefName: "refs/heads/main",
      mergeStatus: "succeeded",
      isDraft: false,
      mergeId: "b912cc64-ca78-4784-aac1-491e615d019b",
      lastMergeSourceCommit: {
        commitId: commitId1,
        url:
          "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/commits/" +
          commitId1,
      },
      lastMergeTargetCommit: {
        commitId: commitId2,
        url:
          "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/commits/" +
          commitId2,
      },
      lastMergeCommit: {
        commitId: commitId3,
        url:
          "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/commits/" +
          commitId3,
      },
      reviewers: [
        {
          reviewerUrl:
            "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
            pullRequestId +
            "/reviewers/5a94f22f-f823-68db-bed4-14d5d637dc9e",
          vote: 10,
          votedFor: [
            {
              reviewerUrl:
                "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
                pullRequestId +
                "/reviewers/8902012d-bb30-4e61-97df-1bc7b7a1700f",
              vote: 0,
              displayName: `[${adoProjectName}]\\BAs`,
              url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/8902012d-bb30-4e61-97df-1bc7b7a1700f",
              _links: {
                avatar: {
                  href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS0xMTM4MzExMTMzLTI1NDcyMTE4NTEtMjM5Mzc0NTU3Ni0zMzY2MTE1NTQ",
                },
              },
              id: "8902012d-bb30-4e61-97df-1bc7b7a1700f",
              uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\BAs",
              imageUrl: "${system.server.url}/_api/_common/identityImage?id=8902012d-bb30-4e61-97df-1bc7b7a1700f",
              isContainer: true,
            },
          ],
          hasDeclined: false,
          isFlagged: false,
          displayName: "Grace Hopper",
          url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/5a94f22f-f823-68db-bed4-14d5d637dc9e",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.NWE5NGYyMmYtZjgyMy03OGRiLWJlZDQtMTRkNWQ2MzdkYzll",
            },
          },
          id: "5a94f22f-f823-68db-bed4-14d5d637dc9e",
          uniqueName: "grace.hopper@example.com",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=5a94f22f-f823-68db-bed4-14d5d637dc9e",
        },
        {
          reviewerUrl:
            "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
            pullRequestId +
            "/reviewers/333e367b-96fc-4297-8ce9-1b6467516960",
          vote: 10,
          hasDeclined: false,
          isRequired: true,
          isFlagged: false,
          displayName: `[${adoProjectName}]\\Frontend_Team`,
          url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/333e367b-96fc-4297-8ce9-1b6467516960",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS03OTYzMzA4MjUtMzg1MjA5Mzc3MS0yOTk4NjAxMzYxLTIxNjMzNDcxOTM",
            },
          },
          id: "333e367b-96fc-4297-8ce9-1b6467516960",
          uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\Frontend_Team",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=333e367b-96fc-4297-8ce9-1b6467516960",
          isContainer: true,
        },
        {
          reviewerUrl:
            "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
            pullRequestId +
            "/reviewers/8902012d-bb30-4e61-97df-1bc7b7a1700f",
          vote: 10,
          hasDeclined: false,
          isRequired: true,
          isFlagged: false,
          displayName: `[${adoProjectName}]\\BAs`,
          url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/8902012d-bb30-4e61-97df-1bc7b7a1700f",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS0xMTM4MzExMTMzLTI1NDcyMTE4NTEtMjM5Mzc0NTU3Ni0zMzY2MTE1NTQ",
            },
          },
          id: "8902012d-bb30-4e61-97df-1bc7b7a1700f",
          uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\BAs",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=8902012d-bb30-4e61-97df-1bc7b7a1700f",
          isContainer: true,
        },
        {
          reviewerUrl:
            "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
            pullRequestId +
            "/reviewers/a81d76f6-9ef1-672f-a48d-44a1d01cd794",
          vote: 10,
          votedFor: [
            {
              reviewerUrl:
                "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
                pullRequestId +
                "/reviewers/333e367b-96fc-4297-8ce9-1b6467516960",
              vote: 0,
              displayName: `[${adoProjectName}]\\Frontend_Team`,
              url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/333e367b-96fc-4297-8ce9-1b6467516960",
              _links: {
                avatar: {
                  href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS03OTYzMzA4MjUtMzg1MjA5Mzc3MS0yOTk4NjAxMzYxLTIxNjMzNDcxOTM",
                },
              },
              id: "333e367b-96fc-4297-8ce9-1b6467516960",
              uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\Frontend_Team",
              imageUrl: "${system.server.url}/_api/_common/identityImage?id=333e367b-96fc-4297-8ce9-1b6467516960",
              isContainer: true,
            },
            {
              reviewerUrl:
                "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
                pullRequestId +
                "/reviewers/c49a7a56-f2c7-4cad-9316-b2926e1c0284",
              vote: 0,
              displayName: `[${adoProjectName}]\\Frontend_Leads`,
              url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/c49a7a56-f2c7-4cad-9316-b2926e1c0284",
              _links: {
                avatar: {
                  href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS0yNTM0NjAxMTkxLTcwMDA1NTM3NS0zMTE2Mzk3MTM3LTI4NTEwMjUwNDM",
                },
              },
              id: "c49a7a56-f2c7-4cad-9316-b2926e1c0284",
              uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\Frontend_Leads",
              imageUrl: "${system.server.url}/_api/_common/identityImage?id=c49a7a56-f2c7-4cad-9316-b2926e1c0284",
              isContainer: true,
            },
          ],
          hasDeclined: false,
          isFlagged: false,
          displayName: "Ada Lovelace",
          url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/a81d76f6-9ef1-672f-a48d-44a1d01cd794",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.YTgxZDc2ZjYtOWVmMS03NzJmLWE0OGQtNDRhMWQwMWNkNzk0",
            },
          },
          id: "a81d76f6-9ef1-672f-a48d-44a1d01cd794",
          uniqueName: "ada.lovelace@example.com",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=a81d76f6-9ef1-672f-a48d-44a1d01cd794",
        },
        {
          reviewerUrl:
            "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
            pullRequestId +
            "/reviewers/c49a7a56-f2c7-4cad-9316-b2926e1c0284",
          vote: 10,
          hasDeclined: false,
          isRequired: true,
          isFlagged: false,
          displayName: `[${adoProjectName}]\\Frontend_Leads`,
          url: "${system.server.url}/A170e9fe7-998b-4db8-9600-82ec8e2efcf2/_apis/Identities/c49a7a56-f2c7-4cad-9316-b2926e1c0284",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMzcxOTY1Mjg0LTMzMDM5NjczMDctMjUyOTY3Mjc5OC01NzY1MzY2NDItMS0yNTM0NjAxMTkxLTcwMDA1NTM3NS0zMTE2Mzk3MTM3LTI4NTEwMjUwNDM",
            },
          },
          id: "c49a7a56-f2c7-4cad-9316-b2926e1c0284",
          uniqueName: "vstfs:///Classification/TeamProject/019f028e-3986-4a03-b572-b9a154cd9218\\Frontend_Leads",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=c49a7a56-f2c7-4cad-9316-b2926e1c0284",
          isContainer: true,
        },
      ],
      url:
        "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/950a0d06-bc5d-4512-8334-498c024d161e/pullRequests/" +
        pullRequestId,
      completionOptions: {
        mergeCommitMessage: `Merged PR ${pullRequestId}: ${commitMessage}`,
        squashMerge: true,
        mergeStrategy: "squash",
        transitionWorkItems: true,
        autoCompleteIgnoreConfigIds: [],
      },
      supportsIterations: true,
      completionQueueTime: closedDate.toISOString(),
    });
  }
  return prs;
}

function getPrCount(date) {
  let prCount = Math.random() * 4 + 1;

  // weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    prCount *= 0.1;
  }

  // monthly bias
  prCount *= 1 + ((date.getMonth() % 3) + 1) * 0.25;
  return Math.round(prCount);
}

function randomInNormalDist() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomInNormalDist(); // resample between 0 and 1
  return num;
}
