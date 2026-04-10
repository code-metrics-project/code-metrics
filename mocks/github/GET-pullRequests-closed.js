const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const req = context.request;
const { owner, repo } = req.pathParams;

// Make dates stable-ish within a day.
const now = new Date();
now.setHours(0, 0, 0, 0);

// Generate a small, deterministic-ish set of closed PRs within the last 30 days.
// This keeps date-based queries like PR Size / PR Open Time non-empty over time.
function makeClosedPr(pullNumber, daysAgoClosed, daysAgoCreated) {
  const closedAt = new Date(now.getTime() - daysAgoClosed * MILLIS_PER_DAY);
  const createdAt = new Date(now.getTime() - daysAgoCreated * MILLIS_PER_DAY);

  return {
    id: pullNumber,
    number: pullNumber,
    state: "closed",
    title: `Mock closed PR #${pullNumber}`,
    url: `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    html_url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    created_at: createdAt.toISOString(),
    updated_at: closedAt.toISOString(),
    closed_at: closedAt.toISOString(),
    merged_at: closedAt.toISOString(),
  };
}

// These are generated relative to "today" so they remain within the default
// UI query window (e.g., last 30 days) regardless of when the tests run.
const prs = [makeClosedPr(2001, 2, 10), makeClosedPr(2002, 5, 12), makeClosedPr(2003, 9, 20)];

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(prs));
