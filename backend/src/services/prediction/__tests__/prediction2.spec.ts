/**
 * @group slow
 */

import { predict2 } from "../prediction2";
import { plotChart } from "./utils";
import { truncateDateOnly } from "../../../utils/date";
import { addDays } from "date-fns";
import { IntermediaryDatedMetrics } from "../../../model/metrics";
import { toIntermediateMap } from "../../../tests/utils";

jest.setTimeout(120_000);

beforeAll(() => {
  global.console = require("console");
});

describe("2d prediction", () => {
  const x1values = [];
  for (let x = 0; x < 300; x++) {
    x1values.push(x);
  }
  const x2values = [];
  for (let x = 300; x > 0; x--) {
    x2values.push(x * 5);
  }
  const yvalues = [];
  for (let y = 300; y > 0; y--) {
    yvalues.push(y / 10);
  }

  const x1map = toIntermediateMap("x1", x1values);
  const x2map = toIntermediateMap("x2", x2values);
  const x: Map<string, IntermediaryDatedMetrics>[] = [x1map, x2map];
  const y = toIntermediateMap("y", yvalues);

  it("should make a prediction", async () => {
    const prediction = await predict2("x2_y1", "prediction", x, y);

    plotChart(prediction);

    expect(prediction.size).toBe(x1values.length);
  });

  it("should make a valid prediction", async () => {
    const prediction = await predict2("x2_y1", "prediction", x, y);

    plotChart(prediction, yvalues);

    expect(prediction.get("2022-01-01").entries.get("prediction").value).toBeGreaterThan(23);

    const lastDate = truncateDateOnly(addDays(new Date("2022-01-01"), x1values.length - 1));
    expect(prediction.get(lastDate).entries.get("prediction").value).toBeLessThan(7);
  });
});
