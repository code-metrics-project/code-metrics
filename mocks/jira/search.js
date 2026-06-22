const MILLIS_PER_DAY = 1000 * 3600 * 24;
const priorities = ["Lowest", "Low", "Medium", "High", "Highest"];
const now = new Date();

const jql = context.request.queryParams.jql;

// approx 1 year of history, unless 'created' specified
const DEFAULT_HISTORIC_DATE = MILLIS_PER_DAY * 365;
const offsetDateRegex = /(-?)(?:(\d+)w)?(?:(\d+)d)?/g;
const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const projectName = getJqlField(jql, "project", "DEV");
const queryPriorityName = getJqlField(jql, "priority", "Low");
const queryIssueType = determineIssueType(jql);
const queryPriority = priorities.indexOf(queryPriorityName);

const start = determineStartDate();

let highestIssueId = 10000;

// whether to look up historic bugs
let useHistoric;
if (projectName === "DEV") {
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
  expand: "schema,names",
  startAt: 0,
  maxResults: 100,
  total: issues.length,
  issues: issues,
};

console.debug(`Generated ${issues.length} issues for project ${projectName} >= ${queryPriorityName} priority`);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(response));

function getJqlField(jql, field, defaultVal) {
  let val;
  const jqlSegments = jql.split(" AND ");
  for (let i = 0; i < jqlSegments.length; i++) {
    const segment = jqlSegments[i].trim();
    if (segment.toUpperCase().startsWith(field.toUpperCase())) {
      if (segment.indexOf("=") > -1) {
        val = segment.split("=")[1].trim();
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
    console.debug(`Parsed JQL field: '${field}' to value: '${val}'`);
  } else {
    val = defaultVal;
    console.debug(`Using default value: '${defaultVal}' for JQL field: ${field}`);
  }
  return val;
}

function determineStartDate() {
  let start;
  const createdRaw = getJqlField(jql, "created", "");
  if (createdRaw?.length) {
    start = getDateFromString(createdRaw);
  } else {
    // look for a resolutiondate
    const resolutionDateRaw = getJqlField(jql, "resolutiondate", "");
    if (resolutionDateRaw) {
      start = new Date(getDateFromString(resolutionDateRaw) - MILLIS_PER_DAY * 7);
    } else {
      start = new Date(now.getTime() - DEFAULT_HISTORIC_DATE);
    }
  }
  console.debug(`Generating issues from date: '${start}'`);
  return start;
}

function getDateFromString(candidateDateStr) {
  // check if actual date
  if (dateOnlyRegex.test(candidateDateStr)) {
    return new Date(candidateDateStr);
  }

  let date = new Date(now.getTime() - DEFAULT_HISTORIC_DATE);

  // check if relative (e.g. -1w6d23h12m)
  if (candidateDateStr) {
    const offsets = offsetDateRegex.exec(candidateDateStr);
    const neg = offsets[1] === "-";
    const weeks = offsets[2] ? Number(offsets[2]) : 0;
    const days = offsets[3] ? Number(offsets[3]) : 0;
    if (weeks !== weeks && days !== days) {
      console.warn("Date offsets not valid numbers");
    } else {
      // Set date const as Date with days offset from current
      let totalDays = weeks * 7 + days;
      if (neg) totalDays = -totalDays;
      date = new Date(new Date().setDate(now.getDate() + totalDays));
    }
  }

  return date;
}

/**
 * Determines the issue type to use; this can handle both 'issueType = foo' syntax
 * as well as 'issueType in (foo, bar)' syntax.
 * @param jql
 * @return {string}
 */
function determineIssueType(jql) {
  let parsedIssueType = "";

  const rawIssueType = getJqlField(jql, "issuetype", "Bug");
  const inClausePattern = /\(.+\)/;
  if (inClausePattern.test(rawIssueType)) {
    const typesList = rawIssueType.substring(1, rawIssueType.length - 1).trim();
    console.debug("Issue types: " + typesList);
    if (typesList.length > 0) {
      const firstIssueType = typesList.split(",")[0].trim();
      console.debug("First issue type: " + firstIssueType);
      parsedIssueType = firstIssueType;
    } else {
      throw new Error(`Unable to parse issue type clause: ${rawIssueType}`);
    }
  } else {
    // assumed to be
    parsedIssueType = rawIssueType;
  }

  return parsedIssueType.replaceAll('"', "");
}

function generateIssues(date, minPriority, useHistoric) {
  const issueCount = useHistoric ? lookupHistoric(date) : genIssueCount(date);

  const issues = [];
  for (let i = 0; i < issueCount; i++) {
    const issueId = (++highestIssueId).toString();
    const priority = Math.round(randomInNormalDist() * (priorities.length - 1));
    if (priority < minPriority) {
      continue;
    }

    // 1-based, apparently
    const priorityId = (priority + 1).toString();
    const priorityName = priorities[priority];

    // 50% chance of a resolution date
    const resolved = Math.random() > 0.5
        ? new Date(date.getTime() + Math.random() * MILLIS_PER_DAY * 7)
        : null;

    issues.push({
      expand: "operations,versionedRepresentations,editmeta,changelog,renderedFields",
      id: issueId,
      self: `https://example.atlassian.net/rest/api/2/issue/${issueId}`,
      key: `${projectName}-${issueId}`,
      fields: {
        issuetype: {
          name: queryIssueType,
        },
        priority: {
          self: `https://example.atlassian.net/rest/api/2/priority/${priorityId}`,
          iconUrl: `https://example.atlassian.net/images/icons/priorities/${priorityName.toLowerCase()}.svg`,
          name: priorityName,
          id: priorityId,
        },
        created: date.toISOString(),
        resolutiondate: resolved?.toISOString(),
        summary: `Issue ${issueId}`,
      },
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
