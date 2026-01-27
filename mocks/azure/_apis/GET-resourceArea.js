/**
 * Returns a specific resource area by ID from the ResourceAreas list.
 * The azure-devops-node-api library calls this to locate API endpoints.
 */

var areaId = context.request.pathParams.areaId;
var allAreas = require("./GET-ResourceAreas.json");

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
        locationUrl = locationUrl.replace("${system.server.url}", context.environment.server.url);
    }
    
    respond()
        .withStatusCode(200)
        .withHeader("Content-Type", "application/json; charset=utf-8")
        .withData(JSON.stringify({
            id: matchingArea.id,
            name: matchingArea.name,
            locationUrl: locationUrl
        }));
} else {
    respond()
        .withStatusCode(404)
        .withHeader("Content-Type", "application/json; charset=utf-8")
        .withData(JSON.stringify({
            message: "Resource area not found: " + areaId
        }));
}
