/**
 * Returns a specific resource area by ID from the ResourceAreas list.
 * The azure-devops-node-api library calls this to locate API endpoints.
 */

function getHeader(headers, name) {
  if (!headers) {
    return undefined;
  }

  var target = name.toLowerCase();
  var keys = Object.keys(headers);
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index];
    var value = headers[key];
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return undefined;
}

function resolveExternalBaseUrl(ctx) {
  var request = ctx && ctx.request;
  var headers = request && request.headers;
  var forwardedHost = getHeader(headers, "x-forwarded-host");
  var host = forwardedHost || getHeader(headers, "host");

  if (!host) {
    return ctx && ctx.environment && ctx.environment.server && ctx.environment.server.url;
  }

  var forwardedProto = getHeader(headers, "x-forwarded-proto");
  var protocol = (forwardedProto || "https").split(",")[0].trim() || "https";
  var forwardedPort = (getHeader(headers, "x-forwarded-port") || "").trim();
  var defaultPort = protocol === "https" ? "443" : "80";
  var hostIncludesPort = host.indexOf(":") !== -1;
  var portSuffix = "";
  if (forwardedPort && forwardedPort !== defaultPort && !hostIncludesPort) {
    portSuffix = ":" + forwardedPort;
  }

  return protocol + "://" + host + portSuffix;
}

var areaId = context.request.pathParams.areaId;
var resourceAreasStore = stores.open("resourceAreas");
var allAreas = resourceAreasStore.loadAll();
if (!allAreas || !allAreas.value) {
  allAreas = resourceAreasStore.load("data");
}

// Find the matching resource area
var matchingArea = null;
for (var i = 0; i < allAreas.value.length; i++) {
  if (allAreas.value[i].id === areaId) {
    matchingArea = allAreas.value[i];
    break;
  }
}

if (matchingArea) {
  // Replace template placeholder with actual server URL
  var locationUrl = matchingArea.locationUrl;
  if (locationUrl && locationUrl.indexOf("${system.server.url}") !== -1) {
    locationUrl = locationUrl.replace("${system.server.url}", resolveExternalBaseUrl(context));
  }

  respond()
    .withStatusCode(200)
    .withHeader("Content-Type", "application/json; charset=utf-8")
    .withData(
      JSON.stringify({
        id: matchingArea.id,
        name: matchingArea.name,
        locationUrl: locationUrl,
      }),
    );
} else {
  respond()
    .withStatusCode(404)
    .withHeader("Content-Type", "application/json; charset=utf-8")
    .withData(
      JSON.stringify({
        message: "Resource area not found: " + areaId,
      }),
    );
}
