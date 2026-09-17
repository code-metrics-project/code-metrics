handle(context.request);

function handle(req) {
  // e.g. "athena_ui_subject_portal:src/components"
  var componentKey = req.queryParams.component;
  if (!componentKey) {
    respond().withStatusCode(400).withData("Missing 'component' query param");
    return;
  }

  var componentPath = componentKey.split(":")[1];
  var splitPath = componentPath.split("/");
  var componentName = splitPath[splitPath.length - 1];

  // e.g. "coverage"
  var metricKeyParams = req.queryParams.metricKeys;
  if (!metricKeyParams) {
    respond().withStatusCode(400).withData("Missing 'metricKeys' query param");
    return;
  }

  var measures = [];
  var metricKeys = metricKeyParams.split(",");
  for (var i = 0; i < metricKeys.length; i++) {
    var metricKey = metricKeys[i];
    var metricValue = 0;
    switch (metricKey) {
      case "coverage":
        metricValue = Math.random() * 100;
        break;
      case "ncloc":
        metricValue = randomInNormalDist() * 100000;
        break;
      case "complexity":
        metricValue = Math.random() * 3000;
        break;
      default:
        respond()
          .withStatusCode(400)
          .withData("Unsupported metric key: " + metricKey);
        return;
    }
    // metric values are returned as strings
    measures.push({ metric: metricKey, value: Math.round(metricValue).toString(), bestValue: false });
  }

  var response = {
    component: {
      key: componentKey,
      name: componentName,
      qualifier: "DIR",
      path: componentPath,
      measures: measures,
    },
  };

  respond().withData(JSON.stringify(response)).withHeader("Content-Type", "application/json");
}

function randomInNormalDist() {
  var u = 0;
  var v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  var num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomInNormalDist(); // resample between 0 and 1
  return num;
}
