import { matchOrEquals } from "../matchers";

describe("matchOrEquals", () => {
  it("should return true if the subject matches the comparand", () => {
    expect(matchOrEquals("foo", "foo")).toBe(true);
    expect(matchOrEquals("foo", "foobar")).toBe(false);
    expect(matchOrEquals("/foo/", "foo")).toBe(true);
    expect(matchOrEquals("/foo/", "foobar")).toBe(true);
  });

  it("should return false for non-string inputs", () => {
    expect(matchOrEquals(undefined as unknown as string, "foo")).toBe(false);
    expect(matchOrEquals(null as unknown as string, "foo")).toBe(false);
    expect(matchOrEquals("foo", undefined as unknown as string)).toBe(false);
    expect(matchOrEquals("foo", null as unknown as string)).toBe(false);
    expect(matchOrEquals({} as unknown as string, "foo")).toBe(false);
    expect(matchOrEquals(["foo"] as unknown as string, "foo")).toBe(false);
  });
});
