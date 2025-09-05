import { validateLicense } from "../validate";
import path from "path";

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
