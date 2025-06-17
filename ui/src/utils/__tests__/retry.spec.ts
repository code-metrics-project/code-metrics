import { describe, expect, it, vi } from "vitest";
import { retryOperationUntilTimeout } from "../retry";

describe("retryOperationUntilTimeout", () => {
  it("resolves immediately if operation succeeds first try", async () => {
    const op = vi.fn().mockResolvedValue("success");
    const result = await retryOperationUntilTimeout({ name: "test", timeout: 1000 }, op);
    expect(result).toBe("success");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries until operation succeeds", async () => {
    let attempts = 0;
    const op = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) return Promise.reject(new Error("fail"));
      return Promise.resolve("ok");
    });
    const result = await retryOperationUntilTimeout({ name: "test", timeout: 2000, interval: 10 }, op);
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("throws after timeout if operation never succeeds", async () => {
    const op = vi.fn().mockRejectedValue(new Error("fail"));
    await expect(retryOperationUntilTimeout({ name: "test", timeout: 50, interval: 10 }, op)).rejects.toThrow(
      /timed out/,
    );
    expect(op).toHaveBeenCalled();
  });

  it("throws if timeout is zero or negative", async () => {
    const op = vi.fn();
    await expect(retryOperationUntilTimeout({ name: "test", timeout: 0 }, op)).rejects.toThrow(
      /Timeout must be greater than 0/,
    );
    await expect(retryOperationUntilTimeout({ name: "test", timeout: -1 }, op)).rejects.toThrow(
      /Timeout must be greater than 0/,
    );
  });
});
