import { toRollingAverage } from "../rollingAverages";
import { toIntermediateMap } from "../../../tests/utils";

describe("toRollingAverage", () => {
  it("should calculate a simple rolling average accurately", () => {
    const data = toIntermediateMap("example", [-1, 1, 2, 3, -1, 5, 6, 7, 10, 8, -1]);
    const result = toRollingAverage(data, {
      removeOutliers: false,
      spansInDays: 7,
      model: "simple",
    });
    const expectedResult = toIntermediateMap("example/1-week-average", [-1, 1, 1.5, 2, 2, 2.75, 3.4, 4, 5.5, 6.5]);
    expect(result).toEqual(expectedResult);
  });

  it("should calculate a rolling average without outliers", () => {
    const data = toIntermediateMap("example", [-1, 1, 12, 14, -1, 16, 16, 18, 100, 18, -1]);
    const result = toRollingAverage(data, {
      removeOutliers: true,
      spansInDays: 7,
      model: "simple",
    });
    const expectedResult = toIntermediateMap(
      "example/1-week-average",
      [-1, -1, 12, 13, 13, 14, 14.5, 15.2, 15.2, 16.4],
    );
    expect(result).toEqual(expectedResult);
  });

  it("should calculate a weighted rolling average accurately", () => {
    const data = toIntermediateMap("example", [-1, 1, 2, 3, -1, 5, 6, 7, 10, 8, -1]);
    const result = toRollingAverage(data, {
      removeOutliers: false,
      spansInDays: 7,
      model: "weighted",
    });
    const expectedResult = toIntermediateMap(
      "example/1-week-average",
      [
        -1, 1, 1.5384615384615385, 2.111111111111111, 2.1333333333333333, 3.210526315789474, 4.181818181818182,
        5.166666666666667, 6.8, 7.423076923076923,
      ],
    );
    expect(result).toEqual(expectedResult);
  });
});
