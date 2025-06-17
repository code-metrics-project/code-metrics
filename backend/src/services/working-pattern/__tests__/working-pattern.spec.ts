import { NonWorkingSeverity, testables } from "../working-pattern";

import { TeamWorkingPattern, Workload } from "../../../model/config/workload-config";

const { categoriseSeverity, fromLocalTimeToUTC, toUTC, getWorkingPatternForWorkload } = testables;

describe("categoriseSeverity", () => {
  const pattern: TeamWorkingPattern = {
    startHour: 9,
    endHour: 17,
    startDay: 1, // Monday
    endDay: 5, // Friday
    timezone: "UTC",
  };

  it("returns High for changes on Sunday", () => {
    const changeDateTime = new Date("2023-10-01T10:00:00Z"); // Sunday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.High);
  });

  it("returns High for changes on Saturday", () => {
    const changeDateTime = new Date("2023-10-07T10:00:00Z"); // Saturday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.High);
  });

  it("returns Low for changes within one hour before start time", () => {
    const changeDateTime = new Date("2023-10-02T08:30:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.Low);
  });

  it("returns Low for changes within one hour after end time", () => {
    const changeDateTime = new Date("2023-10-02T17:30:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.Low);
  });

  it("returns Medium for changes within three hours before start time", () => {
    const changeDateTime = new Date("2023-10-02T06:30:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.Medium);
  });

  it("returns Medium for changes within three hours after end time", () => {
    const changeDateTime = new Date("2023-10-02T20:00:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.Medium);
  });

  it("returns High for changes more than three hours before start time", () => {
    const changeDateTime = new Date("2023-10-02T04:30:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.High);
  });

  it("returns High for changes more than three hours after end time", () => {
    const changeDateTime = new Date("2023-10-02T21:00:00Z"); // Monday
    expect(categoriseSeverity(changeDateTime, pattern)).toBe(NonWorkingSeverity.High);
  });
});

describe("fromLocalTimeToUTC", () => {
  it("converts local time to UTC for a given timezone", () => {
    const result = fromLocalTimeToUTC(1, 9, "America/New_York"); // Monday, 9 AM EST
    expect(result.getUTCHours()).toBe(14); // 2 PM UTC
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  it("handles time conversion crossing midnight", () => {
    const result = fromLocalTimeToUTC(1, 23, "Asia/Tokyo"); // Monday, 11 PM JST
    expect(result.getUTCHours()).toBe(14); // 2 PM UTC
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  it("handles time conversion for UTC timezone", () => {
    const result = fromLocalTimeToUTC(1, 9, "UTC"); // Monday, 9 AM UTC
    expect(result.getUTCHours()).toBe(9); // 9 AM UTC
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  it("handles time conversion for timezones with negative offsets", () => {
    const result = fromLocalTimeToUTC(1, 9, "America/Los_Angeles"); // Monday, 9 AM PST
    expect(result.getUTCHours()).toBe(17); // 5 PM UTC
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  it("handles time conversion for timezones with positive offsets", () => {
    const result = fromLocalTimeToUTC(1, 9, "Asia/Kolkata"); // Monday, 9 AM IST
    expect(result.getUTCHours()).toBe(3); // 3:30 AM UTC
    expect(result.getUTCMinutes()).toBe(30); // 30 minutes
    expect(result.getUTCDay()).toBe(1); // Monday
  });
});

describe("toUTC", () => {
  it("converts working pattern hours to UTC for a given timezone", () => {
    const pattern: TeamWorkingPattern = {
      startHour: 9,
      endHour: 17,
      startDay: 1, // Monday
      endDay: 5, // Friday
      timezone: "America/New_York",
    };
    const result = toUTC(pattern);
    expect(result.startHour).toBe(14); // 9 AM EST is 2 PM UTC
    expect(result.endHour).toBe(22); // 5 PM EST is 10 PM UTC
    expect(result.startDay).toBe(1);
    expect(result.endDay).toBe(5);
    expect(result.timezone).toBe("UTC");
  });

  it("handles working pattern with start and end hours in different timezones", () => {
    const pattern: TeamWorkingPattern = {
      startHour: 23,
      endHour: 7,
      startDay: 1, // Monday
      endDay: 5, // Friday
      timezone: "Asia/Tokyo",
    };
    const result = toUTC(pattern);
    expect(result.startHour).toBe(14); // 11 PM JST is 2 PM UTC
    expect(result.endHour).toBe(22); // 7 AM JST is 10 PM UTC
    expect(result.startDay).toBe(1);
    expect(result.endDay).toBe(4); // Sunday
    expect(result.timezone).toBe("UTC");
  });

  it("handles working pattern with start and end hours in UTC", () => {
    const pattern: TeamWorkingPattern = {
      startHour: 9,
      endHour: 17,
      startDay: 1, // Monday
      endDay: 5, // Friday
      timezone: "UTC",
    };
    const result = toUTC(pattern);
    expect(result.startHour).toBe(9);
    expect(result.endHour).toBe(17);
    expect(result.startDay).toBe(1);
    expect(result.endDay).toBe(5);
    expect(result.timezone).toBe("UTC");
  });

  it("handles working pattern with start and end hours crossing midnight", () => {
    const pattern: TeamWorkingPattern = {
      startHour: 22,
      endHour: 6,
      startDay: 1, // Monday
      endDay: 5, // Friday
      timezone: "Europe/London",
    };
    const result = toUTC(pattern);
    expect(result.startHour).toBe(22); // 10 PM GMT is 10 PM UTC
    expect(result.endHour).toBe(6); // 6 AM GMT is 6 AM UTC
    expect(result.startDay).toBe(1);
    expect(result.endDay).toBe(5);
    expect(result.timezone).toBe("UTC");
  });
});

describe("getWorkingPatternForWorkload", () => {
  it("returns default working pattern when workload has no team", () => {
    const workload = {} as Workload;
    const result = getWorkingPatternForWorkload(workload);
    expect(result).toEqual({
      startHour: 9,
      endHour: 17,
      startDay: 1,
      endDay: 5,
      timezone: "UTC",
    });
  });

  it("returns working pattern with specified hours and days", () => {
    const workload = {
      team: {
        workingPattern: {
          startHour: 8,
          endHour: 16,
          startDay: "Tuesday",
          endDay: "Thursday",
          timezone: "America/New_York",
        },
      },
    } as Workload;
    const result = getWorkingPatternForWorkload(workload);
    expect(result).toEqual({
      startHour: 13, // 8 AM EST is 1 PM UTC
      endHour: 21, // 4 PM EST is 9 PM UTC
      startDay: 2,
      endDay: 4,
      timezone: "UTC",
    });
  });

  it("handles working pattern with string day names", () => {
    const workload = {
      team: {
        workingPattern: {
          startHour: 10,
          endHour: 18,
          startDay: "Wednesday",
          endDay: "Friday",
          timezone: "Europe/London",
        },
      },
    } as Workload;
    const result = getWorkingPatternForWorkload(workload);
    expect(result).toEqual({
      startHour: 10,
      endHour: 18,
      startDay: 3,
      endDay: 5,
      timezone: "UTC",
    });
  });

  it("handles working pattern with numeric day indices", () => {
    const workload = {
      team: {
        workingPattern: {
          startHour: 7,
          endHour: 15,
          startDay: 0, // Sunday
          endDay: 6, // Saturday
          timezone: "Asia/Tokyo",
        },
      },
    } as Workload;
    const result = getWorkingPatternForWorkload(workload);
    expect(result).toEqual({
      startHour: 22, // 7 AM JST is 10 PM UTC
      endHour: 6, // 3 PM JST is 6 AM UTC
      startDay: 6, // Saturday (day before)
      endDay: 6,
      timezone: "UTC",
    });
  });

  it("returns default working pattern when workload has no working pattern", () => {
    const workload = {
      team: {},
    } as Workload;
    const result = getWorkingPatternForWorkload(workload);
    expect(result).toEqual({
      startHour: 9,
      endHour: 17,
      startDay: 1,
      endDay: 5,
      timezone: "UTC",
    });
  });
});
