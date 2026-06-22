/**
 * Mock for GitHub repos listing with pagination (PAT mode).
 * Returns 101 repos to test pagination (default page size is 100).
 */

var req = context.request;
var page = parseInt(req.queryParams.page || "1");
var perPage = parseInt(req.queryParams.per_page || "30");
var org = req.pathParams.org;

// Generate 101 repos
var allRepos = [];

for (var i = 1; i <= 101; i++) {
  var repoName = i === 1 ? "hello-world" : "repo-" + i;
  allRepos.push({
    id: i,
    node_id: "MDEwOlJlcG9zaXRvcnk" + i,
    name: repoName,
    full_name: org + "/" + repoName,
    owner: {
      login: org,
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/" + org.toLowerCase() + "_happy.gif",
      type: "Organization"
    },
    private: false,
    html_url: "https://github.com/" + org + "/" + repoName,
    description: "Repository " + repoName,
    fork: false,
    url: "https://api.github.com/repos/" + org + "/" + repoName,
    default_branch: "main"
  });
}

// Calculate pagination
var startIndex = (page - 1) * perPage;
var endIndex = startIndex + perPage;
var paginatedRepos = allRepos.slice(startIndex, endIndex);

console.debug("GET /orgs/" + org + "/repos - Page " + page + ", Per page: " + perPage + ", Total: " + allRepos.length + ", Returning: " + paginatedRepos.length);

// Build Link header for pagination
var totalPages = Math.ceil(allRepos.length / perPage);
var links = [];
// Use path only (without query string) to build pagination URLs
var basePath = context.request.path;

if (page < totalPages) {
  links.push("<" + basePath + "?type=all&page=" + (page + 1) + "&per_page=" + perPage + '>; rel="next"');
  links.push("<" + basePath + "?type=all&page=" + totalPages + "&per_page=" + perPage + '>; rel="last"');
}
if (page > 1) {
  links.push("<" + basePath + "?type=all&page=" + (page - 1) + "&per_page=" + perPage + '>; rel="prev"');
  links.push("<" + basePath + "?type=all&page=1&per_page=" + perPage + '>; rel="first"');
}

var responseBuilder = respond()
  .withStatusCode(200)
  .withHeader("Content-Type", "application/json")
  .withData(JSON.stringify(paginatedRepos));

if (links.length > 0) {
  responseBuilder.withHeader("Link", links.join(", "));
}

responseBuilder;
