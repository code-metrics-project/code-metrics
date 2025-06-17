handle(context.request);

function handle(req) {
  // e.g. "athena_ui_subject_portal:src/components"
  const componentKey = req.queryParams.component;
  if (!componentKey) {
    respond().withStatusCode(400).withData("Missing 'component' query param");
    return;
  }

  const componentPath = componentKey.split(":")[1];
  const splitPath = componentPath.split("/");
  const componentName = splitPath[splitPath.length - 1];

  // e.g. "coverage"
  const metricKeyParams = req.queryParams.metricKeys;
  if (!metricKeyParams) {
    respond().withStatusCode(400).withData("Missing 'metricKeys' query param");
    return;
  }

  const measures = [];
  const metricKeys = metricKeyParams.split(",");
  for (const metricKey of metricKeys) {
    let metricValue = 0;
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
        respond().withStatusCode(400).withData(`Unsupported metric key: ${metricKey}`);
        return;
    }
    // metric values are returned as strings
    measures.push({ metric: metricKey, value: Math.round(metricValue).toString(), bestValue: false });
  }

  const response = {
    component: {
      key: componentKey,
      name: componentName,
      qualifier: "DIR",
      path: componentPath,
      measures: measures,
    },
  };

  logger.debug(`Generated ${measures.length} measures for component ${componentKey}`);
  respond().withData(JSON.stringify(response));
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
