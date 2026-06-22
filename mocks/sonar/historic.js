const MILLIS_PER_DAY = 1000 * 3600 * 24;

const now = new Date();
now.setHours(0, 0, 0, 0);

const defaultStartDate = new Date(now.getTime() - MILLIS_PER_DAY * 365);

const req = context.request;
const component = req.queryParams.component;

const reqFrom = req.queryParams.from || defaultStartDate;
console.debug(`Start date: ${reqFrom}`);
const startDate = new Date(reqFrom);

const reqMetrics = req.queryParams.metrics.split(",");

const measures = [];
if (metricRequested("coverage")) {
  const coverage = genCoverage(startDate);
  measures.push({ metric: "coverage", history: coverage });
  console.debug(`Generated ${coverage.length} coverage entries for ${component}`);
}
if (metricRequested("lines_to_cover")) {
  const lines = genNcLoc(startDate);
  measures.push({ metric: "lines_to_cover", history: lines });
  console.debug(`Generated ${lines.length} lines_to_cover entries for ${component}`);
}
if (metricRequested("ncloc")) {
  const ncloc = genNcLoc(startDate);
  measures.push({ metric: "ncloc", history: ncloc });
  console.debug(`Generated ${ncloc.length} ncloc entries for ${component}`);
}

const total = measures[0].length;

const response = {
  paging: { pageIndex: 1, pageSize: 1000, total: total },
  measures: measures,
};

respond().withContent(JSON.stringify(response)).withHeader("Content-Type", "application/json");

function metricRequested(metricName) {
  for (const reqMetric of reqMetrics) {
    if (reqMetric === metricName) {
      return true;
    }
  }
  return false;
}

function genCoverage(startDate) {
  const covStore = stores.open("coverage");
  const historicCoverage = covStore.load("data");

  const coverage = [];

  const daysAgo = Math.floor((now.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
  for (let day = 0; day < daysAgo; day++) {
    const date = new Date(startDate.getTime() + day * MILLIS_PER_DAY);

    const dayIdx = Math.max(0, historicCoverage.length - 1 - daysAgo + day);
    const cov = historicCoverage[dayIdx];
    const isoDate = date.toISOString();

    console.debug(`${isoDate} cov: ${cov}`);
    coverage.push({ date: isoDate, value: cov.toString() });
  }

  return coverage;
}

function genNcLoc(startDate) {
  const nclocStore = stores.open("ncloc");
  const historicNcloc = nclocStore.load("data");

  const ncloc = [];

  const daysAgo = Math.floor((now.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
  for (let day = 0; day < daysAgo; day++) {
    const date = new Date(startDate.getTime() + day * MILLIS_PER_DAY);

    const dayIdx = Math.max(0, historicNcloc.length - 1 - daysAgo + day);
    const loc = historicNcloc[dayIdx];
    const isoDate = date.toISOString();

    console.debug(`${isoDate} loc: ${loc}`);
    ncloc.push({ date: isoDate, value: loc.toString() });
  }

  return ncloc;
}
