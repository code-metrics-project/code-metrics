const UUID = Java.type("java.util.UUID");
const MILLIS_PER_DAY = 1000 * 3600 * 24;

const now = new Date();
now.setHours(0, 0, 0, 0);

const req = context.request;
const { projectName, repoName, pullRequestId } = req.pathParams;
const fromDateStr = req.queryParams["searchCriteria.fromDate"] || new Date().toISOString().split("T")[0];
const fromDate = new Date(fromDateStr);

// whether to look up historic churn
let useHistoric;
if (repoName === "spring-petclinic") {
  console.log("Using historic commit data");
  useHistoric = true;
} else {
  console.log("Generating synthetic commit data");
  useHistoric = false;
}

let commitCount = pullRequestId ? 1 : useHistoric ? lookupHistoric(fromDate) : getCommitCount(fromDate);

// always return a minimum of 1
commitCount = Math.max(1, commitCount);

const commits = generateCommits(commitCount);

const response = {
  count: commits.length,
  value: commits,
};

console.debug(`Generated ${commits.length} commits for ${projectName}/${repoName} on ${fromDateStr}`);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(response));

function generateCommits(commitCount) {
  const commits = [];
  for (let i = 0; i < commitCount; i++) {
    const gCommitId = UUID.randomUUID().toString();
    const changeCount = Math.round(Math.random() * 30) - 1;

    // Random time between 7am and 7pm
    const randTime = new Date(
      new Date().setHours(7, Math.floor(Math.random() * 60 * 12 + 1), Math.floor(Math.random() * 60), 0),
    )
      .toTimeString()
      .slice(0, 8);

    commits.push({
      commitId: gCommitId,
      author: {
        name: "Ada Lovelace",
        email: "ada.lovelace@example.com",
        date: `${fromDateStr}T${randTime}Z`,
      },
      committer: {
        name: "Grace Hopper",
        email: "grace.hopper@example.com",
        date: `${fromDateStr}T${randTime}Z`,
      },
      comment: "This is an example commit message.",
      commentTruncated: true,
      changeCounts: {
        Add: 0,
        Edit: changeCount,
        Delete: 0,
      },
      url: "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/52d32aef-1397-4252-ae05-4092f7702fa5/commits/4753b4a1afbd91256fdf620c53ff73ca75064f41",
      remoteUrl: `$\{system.server.url}/${projectName}/_git/${repoName}/commit/${gCommitId}`,
    });
  }
  return commits;
}

function getCommitCount(date) {
  let commitCount = Math.random() * 10;

  // weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    commitCount *= 0.1;
  }

  // monthly bias
  commitCount *= 1 + ((date.getMonth() % 3) + 1) * 2;
  return Math.round(commitCount);
}

function lookupHistoric(date) {
  const churnStore = stores.open("churn");
  const historic = churnStore.load("data");

  const daysAgo = Math.floor((now.getTime() - date.getTime()) / MILLIS_PER_DAY);
  const dayIdx = Math.max(0, historic.length - 1 - daysAgo);
  const churn = historic[dayIdx];

  console.log(`${date} churn: ${churn}`);
  return churn;
}
