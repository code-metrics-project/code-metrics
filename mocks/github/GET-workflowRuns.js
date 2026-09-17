const req = context.request;
const { owner, repo } = req.pathParams;
const createdFilter = req.queryParams.created || undefined;
const statusFilter = req.queryParams.status || undefined;
const branchFilter = req.queryParams.branch || undefined;

const now = new Date();

function daysAgoDate(daysAgo, hour = 0, minute = 0, second = 0) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, second, 0);
  return d;
}

function isoDaysAgo(daysAgo, hour = 10, minute = 0, second = 0) {
  return daysAgoDate(daysAgo, hour, minute, second).toISOString();
}

// ---------------------------------------------------------------------------
// Legacy two-run payload
//
// Integration tests (and other consumers) query historical `created` windows
// (e.g. 2011-04-19) that predate the generated 14-day dataset below. When the
// requested window does not overlap the generated data, serve the classic
// two-run payload instead, exactly as the previous static mock did.
// ---------------------------------------------------------------------------
function legacyPayload() {
  const run1Started = isoDaysAgo(1, 10, 33, 8);
  const run1Updated = isoDaysAgo(1, 10, 43, 8);
  const run2Started = isoDaysAgo(2, 11, 33, 8);
  const run2Updated = isoDaysAgo(2, 11, 43, 8);

  const conclusions = ["success", "failure", "cancelled"];
  const randomConclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
  const randomConclusion2 = conclusions[Math.floor(Math.random() * conclusions.length)];

  return {
    total_count: 2,
    workflow_runs: [
      {
        id: 30433642,
        name: "Build",
        head_branch: "main",
        head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
        run_number: 562,
        event: "push",
        status: "completed",
        conclusion: randomConclusion,
        workflow_id: 159038,
        url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/30433642`,
        html_url: `https://github.com/${owner}/${repo}/actions/runs/30433642`,
        created_at: run1Started,
        updated_at: run1Updated,
        run_started_at: run1Started,
        actor: {
          login: "octocat",
          type: "User",
        },
        repository: {
          name: "hello-world",
        },
        head_commit: {
          id: "acb5820ced9479c074f688cc328bf03f341a511d",
          timestamp: isoDaysAgo(1, 10, 33, 5),
        },
      },
      {
        id: 30433643,
        name: "Build",
        head_branch: "main",
        head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
        run_number: 563,
        event: "push",
        status: "completed",
        conclusion: randomConclusion2,
        workflow_id: 159039,
        url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/30433643`,
        html_url: `https://github.com/${owner}/${repo}/actions/runs/30433643`,
        created_at: run2Started,
        updated_at: run2Updated,
        run_started_at: run2Started,
        actor: {
          login: "octocat",
          type: "User",
        },
        repository: {
          name: "hello-world",
        },
        head_commit: {
          id: "acb5820ced9479c074f688cc328bf03f341a511d",
          timestamp: isoDaysAgo(2, 11, 33, 5),
        },
      },
    ],
  };
}

const seed = (function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
})(repo || "unknown");

function shaFrom(k) {
  let s = "";
  let x = (k * 2654435761) >>> 0 || 1;
  while (s.length < 40) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += x.toString(16).padStart(8, "0");
  }
  return s.slice(0, 40);
}

const CONCLUSIONS = ["success", "success", "success", "failure", "cancelled"];
const BRANCHES = ["main", "main", "develop"];
const ACTORS = [
  { login: "octocat", type: "User" },
  { login: "octodev", type: "User" },
  { login: "dependabot[bot]", type: "Bot" },
];

// Generate a deterministic set of completed runs over the last 14 days.
const windowStart = daysAgoDate(13);
const allRuns = [];
for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
  const perDay = (seed + daysAgo) % 3 === 0 ? 2 : 1;
  for (let i = 0; i < perDay; i++) {
    const k = seed + daysAgo * 31 + i * 7;
    const id = 30000000 + ((seed + daysAgo * 31 + i) % 100000);
    const started = daysAgoDate(daysAgo, 8 + (k % 9), (k * 13) % 60, (k * 7) % 60);
    const updated = new Date(started.getTime() + (5 + (k % 20)) * 60000);
    const sha = shaFrom(k);
    allRuns.push({
      id,
      name: repo,
      head_branch: BRANCHES[k % BRANCHES.length],
      head_sha: sha,
      run_number: 500 + (13 - daysAgo) * 3 + i,
      event: "push",
      status: "completed",
      conclusion: CONCLUSIONS[k % CONCLUSIONS.length],
      workflow_id: 159038 + (seed % 1000),
      url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${id}`,
      html_url: `https://github.com/${owner}/${repo}/actions/runs/${id}`,
      created_at: started.toISOString(),
      updated_at: updated.toISOString(),
      run_started_at: started.toISOString(),
      actor: ACTORS[k % ACTORS.length],
      repository: {
        name: "hello-world",
      },
      head_commit: {
        id: sha,
        timestamp: started.toISOString(),
      },
    });
  }
}

let payload;
if (createdFilter) {
  const parts = createdFilter.split("..");
  const from = new Date(`${parts[0]}T00:00:00.000Z`);
  const to = new Date(`${(parts[1] || parts[0])}T23:59:59.999Z`);
  if (!(from <= now && to >= windowStart)) {
    // Historical window with no generated data: fall back to the legacy payload.
    payload = legacyPayload();
  }
}

if (!payload) {
  // Honour the GitHub `created` search qualifier ("YYYY-MM-DD" or
  // "YYYY-MM-DD..YYYY-MM-DD") so per-day fetches are not double counted.
  let runs = allRuns;
  if (createdFilter) {
    const parts = createdFilter.split("..");
    const from = parts[0];
    const to = parts[1] || parts[0];
    runs = runs.filter((r) => {
      const day = r.created_at.slice(0, 10);
      return day >= from && day <= to;
    });
  }
  if (statusFilter) {
    runs = runs.filter((r) => r.status === statusFilter);
  }
  if (branchFilter) {
    runs = runs.filter((r) => r.head_branch === branchFilter);
  }

  payload = {
    total_count: runs.length,
    workflow_runs: runs,
  };
}

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(payload));
