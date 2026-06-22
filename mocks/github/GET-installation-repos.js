/**
 * Mock for GitHub App installation repositories endpoint.
 * Returns 101 repos from Octocat org to test pagination.
 */

var req = context.request;
var page = parseInt(req.queryParams.page || "1");
var perPage = parseInt(req.queryParams.per_page || "30");

// Generate repos from multiple organizations to simulate GitHub App access
var allRepos = [];

// Add 101 repos from Octocat org (for VCS pagination tests)
for (var i = 1; i <= 101; i++) {
  var repoName = i === 1 ? "hello-world" : "repo-" + i;
  allRepos.push({
    id: i,
    node_id: "MDEwOlJlcG9zaXRvcnk" + i,
    name: repoName,
    full_name: "Octocat/" + repoName,
    owner: {
      login: "Octocat",
      id: 1,
      type: "Organization"
    },
    private: false,
    html_url: "https://github.com/Octocat/" + repoName,
    description: "Repository " + repoName,
    fork: false
  });
}

// Add hello-world repo from DeloitteDigitalUK org (for pipeline tests)
allRepos.push({
  id: 200,
  node_id: "MDEwOlJlcG9zaXRvcnkyMDA=",
  name: "hello-world",
  full_name: "DeloitteDigitalUK/hello-world",
  owner: {
    login: "DeloitteDigitalUK",
    id: 2,
    type: "Organization"
  },
  private: false,
  html_url: "https://github.com/DeloitteDigitalUK/hello-world",
  description: "Repository hello-world",
  fork: false
});

// Calculate pagination
var startIndex = (page - 1) * perPage;
var endIndex = startIndex + perPage;
var paginatedRepos = allRepos.slice(startIndex, endIndex);

var response = {
  total_count: allRepos.length,
  repositories: paginatedRepos
};

console.debug("GET /installation/repositories - Page " + page + ", Per page: " + perPage + ", Total: " + allRepos.length + ", Returning: " + paginatedRepos.length);

// Build Link header for pagination
var totalPages = Math.ceil(allRepos.length / perPage);
var links = [];
// Use path only (without query string) to build pagination URLs
var basePath = context.request.path;

if (page < totalPages) {
  links.push("<" + basePath + "?page=" + (page + 1) + "&per_page=" + perPage + '>; rel="next"');
  links.push("<" + basePath + "?page=" + totalPages + "&per_page=" + perPage + '>; rel="last"');
}
if (page > 1) {
  links.push("<" + basePath + "?page=" + (page - 1) + "&per_page=" + perPage + '>; rel="prev"');
  links.push("<" + basePath + "?page=1&per_page=" + perPage + '>; rel="first"');
}

var responseBuilder = respond()
  .withStatusCode(200)
  .withHeader("Content-Type", "application/json")
  .withData(JSON.stringify(response));

if (links.length > 0) {
  responseBuilder.withHeader("Link", links.join(", "));
}

responseBuilder;
