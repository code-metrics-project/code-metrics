const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const req = context.request;
const { owner, repo, pull_number } = req.pathParams;

const pullNumber = parseInt(pull_number, 10);

// Basic validation
if (Number.isNaN(pullNumber) || pullNumber <= 0) {
  respond()
    .withStatusCode(404)
    .withHeader("Content-Type", "application/json")
    .withData(
      JSON.stringify({
        message: "Not Found",
        documentation_url: "https://docs.github.com/rest/pulls/pulls#get-a-pull-request",
      }),
    );
} else {
  // Make dates stable-ish within a day.
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Ensure closed_at is within the last ~2 weeks so PR Size/Open Time queries
  // that default to recent time windows return results.
  const daysAgoClosed = (pullNumber % 10) + 1; // 1..10
  const daysAgoCreated = daysAgoClosed + ((pullNumber % 7) + 3); // at least a few days earlier

  const closedAt = new Date(now.getTime() - daysAgoClosed * MILLIS_PER_DAY);
  const createdAt = new Date(now.getTime() - daysAgoCreated * MILLIS_PER_DAY);

  // Deterministic-ish sizes based on pull number
  const additions = 50 + (pullNumber % 200);
  const deletions = 10 + (pullNumber % 80);
  const changed_files = 1 + (pullNumber % 15);
  const commits = 1 + (pullNumber % 8);

  const prDetail = {
    id: pullNumber,
    number: pullNumber,
    state: "closed",
    title: `Mock PR detail #${pullNumber}`,
    url: `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    html_url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    created_at: createdAt.toISOString(),
    updated_at: closedAt.toISOString(),
    closed_at: closedAt.toISOString(),
    merged_at: closedAt.toISOString(),
    additions,
    deletions,
    changed_files,
    commits,
  };

  respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(prDetail));
}
