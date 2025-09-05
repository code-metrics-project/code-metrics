import { matchOrEquals } from "../matchers";

describe("matchOrEquals", () => {
  it("should return true if the subject matches the comparand", () => {
    expect(matchOrEquals("foo", "foo")).toBe(true);
    expect(matchOrEquals("foo", "foobar")).toBe(false);
    expect(matchOrEquals("/foo/", "foo")).toBe(true);
    expect(matchOrEquals("/foo/", "foobar")).toBe(true);
  });
});
