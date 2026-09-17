import { handler, parseDemoUsers } from "../prepopulateCognito/src/index";
import { __failNextSends, __reset, __sentCommands, __user } from "./mocks/cognitoIdentityProvider.mock";

const USER_POOL_ID = "eu-test_abc123";

const DEMO_USERS = [
  { Username: "admin@example.com", Password: "Admin123!", Email: "admin@example.com" },
  { Username: "dev@example.com", Password: "Devel123!", Email: "dev@example.com" },
];

function setDemoUsers(users: Array<{ Username: string; Password: string; Email: string }>): void {
  process.env.DEMO_USERS = JSON.stringify(users);
}

beforeAll(() => {
  process.env.USER_POOL_ID = USER_POOL_ID;
  setDemoUsers(DEMO_USERS);
});

beforeEach(() => {
  __reset();
  setDemoUsers(DEMO_USERS);
});

describe("prepopulateCognito parseDemoUsers", () => {
  it("parses a JSON array of demo users", () => {
    expect(parseDemoUsers(JSON.stringify(DEMO_USERS))).toEqual(DEMO_USERS);
  });

  it("rejects a missing or empty DEMO_USERS value", () => {
    expect(() => parseDemoUsers(undefined)).toThrow(/DEMO_USERS environment variable is required/);
    expect(() => parseDemoUsers("")).toThrow(/DEMO_USERS environment variable is required/);
    expect(() => parseDemoUsers("[]")).toThrow(/non-empty JSON array/);
  });

  it("rejects invalid JSON and entries missing a username or password", () => {
    expect(() => parseDemoUsers("{not json")).toThrow(/must be valid JSON/);
    expect(() => parseDemoUsers(JSON.stringify([{ Username: "a@example.com" }]))).toThrow(
      /requires Username, Password, and Email/,
    );
    expect(() => parseDemoUsers(JSON.stringify([{ Password: "Secret123!" }]))).toThrow(
      /requires Username, Password, and Email/,
    );
  });

  it("falls back to the username when the email is missing", () => {
    expect(
      parseDemoUsers(JSON.stringify([{ Username: "a@example.com", Password: "Secret123!" }])),
    ).toEqual([{ Username: "a@example.com", Password: "Secret123!", Email: "a@example.com" }]);
  });
});

describe("prepopulateCognito handler", () => {
  const createEvent = {
    RequestType: "Create",
    RequestId: "request-create",
    ResponseURL: "https://cloudformation.us-east-1.amazonaws.com/response",
  };

  it("creates every demo user with a verified email and a permanent password", async () => {
    const result = await handler(createEvent);

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: USER_POOL_ID });
    expect(__user("admin@example.com")).toEqual({
      username: "admin@example.com",
      email: "admin@example.com",
      password: "Admin123!",
    });
    expect(__user("dev@example.com")).toEqual({
      username: "dev@example.com",
      email: "dev@example.com",
      password: "Devel123!",
    });
    expect(__sentCommands().map((command) => command.name)).toEqual([
      "AdminCreateUser",
      "AdminSetUserPassword",
      "AdminCreateUser",
      "AdminSetUserPassword",
    ]);
  });

  it("re-seeds idempotently on Update, resetting existing passwords from the file", async () => {
    await handler(createEvent);

    setDemoUsers([{ Username: "admin@example.com", Password: "NewPass123!", Email: "admin@example.com" }]);
    const result = await handler({
      RequestType: "Update",
      RequestId: "request-update",
      ResponseURL: "https://cloudformation.us-east-1.amazonaws.com/response",
      OldResourceData: { Users: "[]" },
      ResourceProperties: { Users: "[]" },
    });

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: USER_POOL_ID });
    // The pre-existing account is kept, with its password taken from the file.
    expect(__user("admin@example.com")).toEqual({
      username: "admin@example.com",
      email: "admin@example.com",
      password: "NewPass123!",
    });
  });

  it("treats the newer SDK UsernameExistsException as an existing user and resets the password", async () => {
    await handler(createEvent); // seed both users into the mock pool

    const error: any = new Error("User account already exists");
    error.name = "UsernameExistsException";
    error.__type = "UsernameExistsException";
    __failNextSends(1, error);

    const result = await handler({
      RequestType: "Update",
      RequestId: "request-update-username-exists",
      ResponseURL: "https://cloudformation.us-east-1.amazonaws.com/response",
      OldResourceData: { Users: "[]" },
      ResourceProperties: { Users: "[]" },
    });

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: USER_POOL_ID });
    expect(__user("admin@example.com")).toEqual({
      username: "admin@example.com",
      email: "admin@example.com",
      password: "Admin123!",
    });
  });

  it("makes no Cognito calls on Delete", async () => {
    const result = await handler({
      RequestType: "Delete",
      RequestId: "request-delete",
      ResponseURL: "https://cloudformation.us-east-1.amazonaws.com/response",
    });

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: USER_POOL_ID });
    expect(__sentCommands()).toEqual([]);
  });

  it("propagates unexpected Cognito errors", async () => {
    const error: any = new Error("boom");
    error.name = "InternalErrorException";
    __failNextSends(1, error);

    await expect(handler(createEvent)).rejects.toBe(error);
  });

  it("rejects CloudFormation events without a RequestId", async () => {
    await expect(handler({ RequestType: "Create" })).rejects.toThrow(/Missing RequestId/);
  });
});
