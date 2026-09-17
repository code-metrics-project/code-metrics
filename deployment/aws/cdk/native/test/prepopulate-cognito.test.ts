const { parseDemoUsers } = require("../prepopulateCognito/src/index");

describe("prepopulate Cognito DEMO_USERS parsing", () => {
  it("parses a valid DEMO_USERS payload", () => {
    expect(
      parseDemoUsers(
        JSON.stringify([
          { Username: "admin@example.com", Password: "Admin123!", Email: "admin@example.com" },
          { Username: "dev@example.com", Password: "Devel123!", Email: "dev@example.com" },
        ]),
      ),
    ).toEqual([
      { Username: "admin@example.com", Password: "Admin123!", Email: "admin@example.com" },
      { Username: "dev@example.com", Password: "Devel123!", Email: "dev@example.com" },
    ]);
  });

  it("rejects missing, invalid, or incomplete payloads", () => {
    expect(() => parseDemoUsers(undefined)).toThrow(/DEMO_USERS environment variable is required/);
    expect(() => parseDemoUsers("")).toThrow(/DEMO_USERS environment variable is required/);
    expect(() => parseDemoUsers("{")).toThrow(/DEMO_USERS must be valid JSON/);
    expect(() => parseDemoUsers("[]")).toThrow(/non-empty JSON array/);
    expect(() => parseDemoUsers(JSON.stringify([{ Username: "a", Password: "", Email: "a" }]))).toThrow(
      /requires Username, Password, and Email/,
    );
  });
});
