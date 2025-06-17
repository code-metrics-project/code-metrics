import {describe, expect, it} from "vitest";
import {
    dateDiff,
    getOffsetDate,
    getRelativeDate,
    getRelativeDateAsString,
    getTodayDateOnly,
    humaniseDuration,
    truncateDateOnly
} from "../date";

describe("truncateDateOnly", () => {
    it("returns an ISO date string for a date", () => {
        const result = truncateDateOnly(new Date("2022-08-03"));
        expect(result).toBe("2022-08-03");
    });
});

it("should determine the relative date as a string", () => {
    expect(getRelativeDateAsString(new Date("2021-01-01T12:34:56.789Z"), 1)).toBe("2021-01-02");
});

it("should determine the relative date", () => {
    expect(getRelativeDate(new Date("2021-01-01T12:34:56.789Z"), 1)).toStrictEqual(new Date("2021-01-02T00:00:00.000Z"));
});

describe("getOffsetDate", () => {
    it("returns the correct date for a positive offset", () => {
        const result = getOffsetDate(1);
        const expected = new Date();
        expected.setDate(expected.getDate() + 1);
        expect(result.toISOString().split("T")[0]).toBe(expected.toISOString().split("T")[0]);
    });

    it("returns the correct date for a negative offset", () => {
        const result = getOffsetDate(-1);
        const expected = new Date();
        expected.setDate(expected.getDate() - 1);
        expect(result.toISOString().split("T")[0]).toBe(expected.toISOString().split("T")[0]);
    });

    it("returns today's date for a zero offset", () => {
        const result = getOffsetDate(0);
        const expected = new Date();
        expect(result.toISOString().split("T")[0]).toBe(expected.toISOString().split("T")[0]);
    });
});

describe("getTodayDateOnly", () => {
    it("returns today's date in date-only format", () => {
        const result = getTodayDateOnly();
        const expected = new Date().toISOString().split("T")[0];
        expect(result).toBe(expected);
    });
});

describe("dateDiff", () => {
    it("returns zero for the same date", () => {
        const date = new Date("2022-08-03");
        expect(dateDiff(date, date)).toBe(0);
    });

    it("returns positive milliseconds for a later date", () => {
        const date1 = new Date("2022-08-03");
        const date2 = new Date("2022-08-04");
        expect(dateDiff(date1, date2)).toBe(24 * 3600 * 1000);
    });

    it("returns negative milliseconds for an earlier date", () => {
        const date1 = new Date("2022-08-04");
        const date2 = new Date("2022-08-03");
        expect(dateDiff(date1, date2)).toBe(-24 * 3600 * 1000);
    });

    it("handles leap years correctly", () => {
        const date1 = new Date("2020-02-28");
        const date2 = new Date("2020-03-01");
        expect(dateDiff(date1, date2)).toBe(2 * 24 * 3600 * 1000);
    });

    it("handles different months correctly", () => {
        const date1 = new Date("2022-01-31");
        const date2 = new Date("2022-02-01");
        expect(dateDiff(date1, date2)).toBe(24 * 3600 * 1000);
    });
});

describe("humaniseDuration", () => {
  it("returns correct format for zero duration", () => {
    expect(humaniseDuration(0)).toBe("");
  });

  it("returns correct format for seconds only", () => {
    expect(humaniseDuration(45)).toBe("45 seconds");
  });

  it("returns correct format for minutes and seconds", () => {
    expect(humaniseDuration(125)).toBe("2 minutes 5 seconds");
  });

  it("returns correct format for hours, minutes, and seconds", () => {
    expect(humaniseDuration(3665)).toBe("1 hour 1 minute 5 seconds");
  });

  it("returns correct format for large durations", () => {
    expect(humaniseDuration(90061)).toBe("25 hours 1 minute 1 second");
  });
});
