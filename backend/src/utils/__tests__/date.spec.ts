import {
  getRelativeDateAsString,
  truncateDateOnly,
  dateDiffDays,
  walkDateRange,
  dateDiff,
  sameDay,
  todayDateOnly,
  getRelativeDate,
} from "../date";

describe("date", () => {
  it("should truncate date only", () => {
    expect(truncateDateOnly(new Date("2021-01-01T12:34:56.789Z"))).toBe("2021-01-01");
  });

  it("should determine the relative date as a string", () => {
    expect(getRelativeDateAsString(new Date("2021-01-01T12:34:56.789Z"), 1)).toBe("2021-01-02");
  });

  it("should determine the relative date", () => {
    expect(getRelativeDate(new Date("2021-01-01T12:34:56.789Z"), 1)).toStrictEqual(new Date("2021-01-02T00:00:00.000Z"));
  });

  it("should calculate the date difference in days", () => {
    expect(dateDiffDays(new Date("2021-01-01T12:34:56.789Z"), new Date("2021-01-02T12:34:56.789Z"))).toBe(86400000);
  });

  it("should calculate the date difference", () => {
    expect(dateDiff(new Date("2021-01-01T12:34:56.789Z"), new Date("2021-01-01T23:59:59.999Z"))).toBe(41103210);
  });

  it("should walk the date range", async () => {
    const startDate = new Date("2021-01-01T12:34:56.789Z");
    const endDate = new Date("2021-01-03T12:34:56.789Z");
    const operation = jest.fn();
    await walkDateRange(startDate, endDate, operation);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("should determine if two dates are the same day", () => {
    expect(sameDay(new Date("2021-01-01T12:34:56.789Z"), new Date("2021-01-01T23:59:59.999Z"))).toBe(true);
    expect(sameDay(new Date("2021-01-01T12:34:56.789Z"), new Date("2021-01-02T23:59:59.999Z"))).toBe(false);
  });

  it("should get today's date in date only format", () => {
    const today = new Date();
    const actual = todayDateOnly();
    expect(actual.getHours()).toBe(0);
    expect(actual.getMinutes()).toBe(0);
    expect(actual.getSeconds()).toBe(0);
    expect(actual.getMilliseconds()).toBe(0);
    expect(sameDay(actual, today)).toBe(true);
  });
});
