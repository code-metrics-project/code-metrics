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

function replacePlaceholders(value, replacements) {
  if (typeof value === "string") {
    var result = value;
    var placeholders = Object.keys(replacements);
    for (var index = 0; index < placeholders.length; index++) {
      var placeholder = placeholders[index];
      result = result.split(placeholder).join(replacements[placeholder]);
    }
    return result;
  }

  if (Array.isArray(value)) {
    var arrayResult = [];
    for (var itemIndex = 0; itemIndex < value.length; itemIndex++) {
      arrayResult.push(replacePlaceholders(value[itemIndex], replacements));
    }
    return arrayResult;
  }

  if (value && typeof value === "object") {
    var objectResult = {};
    var keys = Object.keys(value);
    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var key = keys[keyIndex];
      objectResult[key] = replacePlaceholders(value[key], replacements);
    }
    return objectResult;
  }

  return value;
}

var repositoriesStore = stores.open("repositories");
var repositories = repositoriesStore.loadAll();
if (!repositories || !repositories.value) {
  repositories = repositoriesStore.load("data");
}

respond()
  .withStatusCode(200)
  .withHeader("Content-Type", "application/json; charset=utf-8; api-version=6.1-preview.1")
  .withData(
    JSON.stringify(
      replacePlaceholders(repositories, {
        "${system.server.url}": resolveExternalBaseUrl(context),
        "${context.request.pathParams.projectName}": context.request.pathParams.projectName,
      }),
    ),
  );
