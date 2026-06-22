/**
 * wiql - Azure DevOps Work Item Query Language mock
 *
 * To support example queries within code-metrics:
 *
 * 1: FULLY SUPPORTED (Returns list - Supports WorkItemTypes, Priority and Created Date)
 *
 * query: "Select [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.CreatedDate],
 * [Microsoft.VSTS.Common.ResolvedDate], [Microsoft.VSTS.Common.Priority] From WorkItems Where
 * [System.WorkItemType] IN ('Bug')
 * AND [Microsoft.VSTS.Common.Priority] >= 2
 * AND [System.CreatedDate] >= '2022-10-17T00:00:00.000Z'"
 *
 * 2: NOT FULLY SUPPORTED (Returns list - Supports WorkItemType and Priority but not date inputs)
 *
 * query: "Select [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.CreatedDate],
 * [Microsoft.VSTS.Common.ResolvedDate], [Microsoft.VSTS.Common.Priority] From WorkItems Where
 * [System.WorkItemType] IN ('Bug')
 * AND [Microsoft.VSTS.Common.Priority] >= 1
 * AND (
 *   ([System.CreatedDate] < '2023-10-25T17:02:12.125Z')
 *      AND
 *   ([Microsoft.VSTS.Common.ResolvedDate] >= '2023-09-25T00:00:00.000Z'
 *      OR [Microsoft.VSTS.Common.ResolvedDate] is EMPTY)
 * )"
 *
 * 3: NOT FULLY SUPPORTED (Returns list - Supports WorkItemType and Priority but not date phrase)
 *
 * query: "Select [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.CreatedDate],
 * [Microsoft.VSTS.Common.ResolvedDate], [Microsoft.VSTS.Common.Priority] From WorkItems Where
 * [System.WorkItemType] IN ('Bug')
 * AND [System.CreatedDate] >= @today-7"
 */

const MILLIS_PER_DAY = 1000 * 3600 * 24;
// approx 1 year of history, unless 'created' specified
const DEFAULT_HISTORIC_DATE = MILLIS_PER_DAY * 365;

const CREATED_STR = "[System.CreatedDate]";
const PRIORITY_STR = "[Microsoft.VSTS.Common.Priority]";
const now = new Date();
const dateOnlyRegex = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z)?$/;

const req = context.request;
const { organizationName: adoOrgName, projectName: adoProjectName } = req.pathParams;

const body = JSON.parse(req.body);
const wiql = body.query;
console.debug("Received wiql query: " + wiql);

// Parse 'SELECT' items
const querySelectItems = wiql.split("Select ")[1].split(" From")[0].split(", ");
const queryIssueType = determineIssueType(wiql);
const queryPriority = getWiqlField(wiql, PRIORITY_STR, 0);
const start = getDateFromString(getWiqlField(wiql, CREATED_STR, ""));

const columns = [];
for (let i = 0; i < querySelectItems.length; i++) {
  const selectItem = querySelectItems[i].replace(/^\[|\]$/g, "");
  columns.push({
    referenceName: selectItem,
    name: selectItem
      .split(".")
      .pop()
      .split(/(?=[A-Z])/)
      .join(" "),
    url: `$\{system.server.url}/${adoOrgName}/_apis/wit/fields/${selectItem}`,
  });
}

let highestIssueId = 10000;

// whether to look up historic bugs
let useHistoric;
if (adoProjectName === "DEV") {
  console.debug("Using historic bug data");
  useHistoric = true;
} else {
  console.debug("Generating synthetic bug data");
  useHistoric = false;
}

let issues = [];
for (let current = start; current < now; current = new Date(current.getTime() + MILLIS_PER_DAY)) {
  issues = issues.concat(generateIssues(current, queryPriority, useHistoric));
}

const response = {
  queryType: "flat",
  queryResultType: "workItem",
  asOf: start,
  columns: columns,
  workItems: issues,
};

console.debug(`Generated ${issues.length} issues for project ${adoProjectName} >= ${queryPriority} priority`);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(response));

/**
 * Determines the issue type to use; this can handle both "[System.WorkItemType] = foo"
 * syntax as well as "[System.WorkItemType] IN ('foo', 'bar')" syntax.
 * @param wiql
 * @return {string}
 */
function determineIssueType(wiql) {
  let parsedIssueType = "";

  const rawIssueType = getWiqlField(wiql, "[System.WorkItemType]", "Bug");
  const inClausePattern = /\(.+\)/;
  if (inClausePattern.test(rawIssueType)) {
    const typesList = rawIssueType.substring(1, rawIssueType.length - 1).trim();
    console.debug("Issue types: " + typesList);
    if (typesList.length > 0) {
      const firstIssueType = typesList.split(",")[0].trim();
      console.debug("First issue type: " + firstIssueType);
      parsedIssueType = firstIssueType;
    } else {
      throw new Error("Unable to parse issue type clause: " + rawIssueType);
    }
  } else {
    // assumed to be
    parsedIssueType = rawIssueType;
  }

  return parsedIssueType.replaceAll("'", "");
}

function getDateFromString(dateStr) {
  // check if actual date
  if (dateOnlyRegex.test(dateStr)) {
    return new Date(dateStr);
  } else {
    return new Date(now.getTime() - DEFAULT_HISTORIC_DATE);
  }
}

function getWiqlField(wiql, field, defaultVal) {
  let val;
  const jqlSegments = wiql.split(" AND ");
  for (let i = 0; i < jqlSegments.length; i++) {
    const segment = jqlSegments[i].trim();
    if (segment.toUpperCase().startsWith(field.toUpperCase())) {
      if (segment.indexOf("=") > -1) {
        val = segment.split("=")[1].trim().replace(/^'|'$/g, "");
        break;
      } else {
        // parses a segment like this:
        // issueType IN ("Bug", "Task")
        const inKeyword = segment.toUpperCase().indexOf(" IN ");
        if (inKeyword > -1) {
          val = segment.substring(inKeyword + 4).trim();
          break;
        }
      }
    }
  }
  if (val) {
    console.debug(`Parsed WIQL field: '${field}' to value: '${val}'`);
  } else {
    val = defaultVal;
    console.debug(`Using default value: '${defaultVal}' for WIQL field: ${field}`);
  }
  return val;
}

function generateIssues(date, minPriority, useHistoric) {
  const issueCount = useHistoric ? lookupHistoric(date) : genIssueCount(date);

  const issues = [];
  for (let i = 0; i < issueCount; i++) {
    const issueId = ++highestIssueId;
    const priority = Math.round(randomInNormalDist() * 4);
    if (priority < minPriority) {
      continue;
    }
    issues.push({
      id: issueId,
      url: `$\{system.server.url}/${adoOrgName}/${adoProjectName}/_apis/wit/workItems/${issueId}`,
    });
  }
  return issues;
}

function genIssueCount(date) {
  let issueCount = Math.random() * 2;

  // weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    issueCount *= 0.1;
  }

  // monthly bias
  issueCount *= 1 + ((date.getMonth() % 3) + 1);
  return Math.round(issueCount);
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

function lookupHistoric(date) {
  const bugStore = stores.open("bugs");
  const historic = bugStore.load("data");

  const daysAgo = Math.floor((now.getTime() - date.getTime()) / MILLIS_PER_DAY);
  const dayIdx = Math.max(0, historic.length - 1 - daysAgo);
  const bugs = historic[dayIdx];

  console.debug(`${date} bugs: ${bugs}`);
  return bugs;
}
