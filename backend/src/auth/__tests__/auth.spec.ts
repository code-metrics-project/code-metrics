import path from "path";
import {generateSecurityTokensFromLogin} from "../tokens";

beforeAll(() => {
  process.env.ACCESS_TOKEN_SECRET = "secret";
  process.env.CONFIG_DIR = path.join(__dirname, "test-data/users");
});

describe("auth", () => {
  it("should return true if the user is authenticated", async () => {
    const tokens = await generateSecurityTokensFromLogin("admin", "admin");
    expect(tokens).not.toBeNull();
  });
  it("should return false if the user is not authenticated", async () => {
    const tokens = await generateSecurityTokensFromLogin("admin", "incorrect");
    expect(tokens).toBeNull();
  });
});

afterAll(() => {
  delete process.env.ACCESS_TOKEN_SECRET;
  delete process.env.CONFIG_DIR;
});
