/**
 * @group slow
 */

import { predict } from "../prediction";
import { plotChart } from "./utils";
import { truncateDateOnly } from "../../../utils/date";
import { addDays } from "date-fns";
import { toIntermediateMap } from "../../../tests/utils";

jest.setTimeout(20000);

beforeAll(() => {
  global.console = require("console");
});

describe("1d prediction", () => {
  const xvalues = [];
  for (let x = 0; x < 100; x++) {
    xvalues.push(x);
  }
  const yvalues = [];
  for (let y = 100; y > 0; y--) {
    yvalues.push(y / 10);
  }

  const x = toIntermediateMap("x", xvalues);
  const y = toIntermediateMap("y", yvalues);

  it("should make a prediction", async () => {
    const prediction = await predict("x1_y1", "prediction", x, y);

    plotChart(prediction);

    expect(prediction.size).toBe(100);
  });

  it("should make a valid prediction", async () => {
    const prediction = await predict("x1_y1", "prediction", x, y);

    plotChart(prediction, yvalues);

    expect(prediction.get("2022-01-01").entries.get("prediction").value).toBeGreaterThan(7);

    const lastDate = truncateDateOnly(addDays(new Date("2022-01-01"), 99));
    expect(prediction.get(lastDate).entries.get("prediction").value).toBeLessThan(2);
  });
});
