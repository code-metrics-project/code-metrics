var MILLIS_PER_DAY = 1000 * 3600 * 24;

var now = new Date();
now.setHours(0, 0, 0, 0);

var defaultStartDate = new Date(now.getTime() - MILLIS_PER_DAY * 365);

var req = context.request;
var component = req.queryParams.component;

var reqFrom = req.queryParams.from || defaultStartDate;
console.log("Start date: " + reqFrom);
var startDate = new Date(reqFrom);

var reqMetrics = req.queryParams.metrics.split(",");

var measures = [];
if (metricRequested("coverage")) {
  var coverage = genCoverage(startDate);
  measures.push({ metric: "coverage", history: coverage });
  console.log("Generated " + coverage.length + " coverage entries for " + component);
}
if (metricRequested("lines_to_cover")) {
  var lines = genNcLoc(startDate);
  measures.push({ metric: "lines_to_cover", history: lines });
  console.log("Generated " + lines.length + " lines_to_cover entries for " + component);
}
if (metricRequested("ncloc")) {
  var ncloc = genNcLoc(startDate);
  measures.push({ metric: "ncloc", history: ncloc });
  console.log("Generated " + ncloc.length + " ncloc entries for " + component);
}

var total = measures[0].length;

var response = {
  paging: { pageIndex: 1, pageSize: 1000, total: total },
  measures: measures,
};

respond().withContent(JSON.stringify(response)).withHeader("Content-Type", "application/json");

function metricRequested(metricName) {
  for (var i = 0; i < reqMetrics.length; i++) {
    if (reqMetrics[i] === metricName) {
      return true;
    }
  }
  return false;
}

function genCoverage(startDate) {
  var covStore = stores.open("coverage");
  var historicCoverage = covStore.load("data");

  var coverage = [];

  var daysAgo = Math.floor((now.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
  for (var day = 0; day < daysAgo; day++) {
    var date = new Date(startDate.getTime() + day * MILLIS_PER_DAY);

    var dayIdx = Math.max(0, historicCoverage.length - 1 - daysAgo + day);
    var cov = historicCoverage[dayIdx];
    var isoDate = date.toISOString();

    coverage.push({ date: isoDate, value: cov.toString() });
  }

  return coverage;
}

function genNcLoc(startDate) {
  var nclocStore = stores.open("ncloc");
  var historicNcloc = nclocStore.load("data");

  var ncloc = [];

  var daysAgo = Math.floor((now.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
  for (var day = 0; day < daysAgo; day++) {
    var date = new Date(startDate.getTime() + day * MILLIS_PER_DAY);

    var dayIdx = Math.max(0, historicNcloc.length - 1 - daysAgo + day);
    var loc = historicNcloc[dayIdx];
    var isoDate = date.toISOString();

    ncloc.push({ date: isoDate, value: loc.toString() });
  }

  return ncloc;
}
