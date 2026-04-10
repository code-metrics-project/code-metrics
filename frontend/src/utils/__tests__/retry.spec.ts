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
      /timed out/
    );
    expect(op).toHaveBeenCalled();
  });

  it("throws if timeout is zero or negative", async () => {
    const op = vi.fn();
    await expect(retryOperationUntilTimeout({ name: "test", timeout: 0 }, op)).rejects.toThrow(
      /Timeout must be greater than 0/
    );
    await expect(retryOperationUntilTimeout({ name: "test", timeout: -1 }, op)).rejects.toThrow(
      /Timeout must be greater than 0/
    );
  });

  describe("exponential backoff", () => {
    it("increases the delay between retries by the backoff multiplier", async () => {
      const delays: number[] = [];
      const realSetTimeout = globalThis.setTimeout;

      // Spy on setTimeout to capture actual delay values
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms) => {
        delays.push(ms as number);
        // Execute immediately so the test doesn't actually wait
        return realSetTimeout(fn as () => void, 0);
      });

      let attempts = 0;
      const op = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 4) return Promise.reject(new Error("fail"));
        return Promise.resolve("done");
      });

      const result = await retryOperationUntilTimeout(
        { name: "backoff-test", timeout: 60_000, interval: 100, backoff: 2 },
        op
      );

      expect(result).toBe("done");
      expect(op).toHaveBeenCalledTimes(5);
      // Delays should double: 100, 200, 400, 800
      expect(delays).toEqual([100, 200, 400, 800]);

      setTimeoutSpy.mockRestore();
    });

    it("caps the interval at maxInterval", async () => {
      const delays: number[] = [];
      const realSetTimeout = globalThis.setTimeout;

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms) => {
        delays.push(ms as number);
        return realSetTimeout(fn as () => void, 0);
      });

      let attempts = 0;
      const op = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 5) return Promise.reject(new Error("fail"));
        return Promise.resolve("done");
      });

      const result = await retryOperationUntilTimeout(
        { name: "cap-test", timeout: 60_000, interval: 100, backoff: 3, maxInterval: 500 },
        op
      );

      expect(result).toBe("done");
      // 100, 300, 500 (capped), 500 (capped), 500 (capped)
      expect(delays).toEqual([100, 300, 500, 500, 500]);

      setTimeoutSpy.mockRestore();
    });

    it("defaults to fixed interval when backoff is not set", async () => {
      const delays: number[] = [];
      const realSetTimeout = globalThis.setTimeout;

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms) => {
        delays.push(ms as number);
        return realSetTimeout(fn as () => void, 0);
      });

      let attempts = 0;
      const op = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 3) return Promise.reject(new Error("fail"));
        return Promise.resolve("done");
      });

      await retryOperationUntilTimeout({ name: "fixed-test", timeout: 60_000, interval: 50 }, op);

      // All delays should be the same (no backoff)
      expect(delays).toEqual([50, 50, 50]);

      setTimeoutSpy.mockRestore();
    });
  });
});
