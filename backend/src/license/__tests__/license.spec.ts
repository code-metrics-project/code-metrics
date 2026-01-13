import { validateLicense } from "../validate";
import path from "path";

let originalStrictMode: string | undefined;
beforeAll(() => {
  originalStrictMode = process.env.STRICT_CONFIG_LOAD;
  process.env.STRICT_CONFIG_LOAD = "false";
});
afterAll(() => {
  process.env.STRICT_CONFIG_LOAD = originalStrictMode;
});

describe("a license checker", () => {
  it("validates a valid license", async () => {
    const result = await validateLicense(path.join(__dirname, "test-data/valid"));
    expect(result).toBeTruthy();
  });
  it("rejects an invalid license", async () => {
    const result = await validateLicense(path.join(__dirname, "test-data/expired"));
    expect(result).toBeFalsy();
  });
  it("rejects a license signed with the wrong key", async () => {
    const result = await validateLicense(path.join(__dirname, "test-data/bad-signature"));
    expect(result).toBeFalsy();
  });
});
