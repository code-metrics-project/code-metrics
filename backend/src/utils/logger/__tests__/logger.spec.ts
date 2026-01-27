import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { logger, verbose, warn, error, LogLevel, overrideLogLevel, isVerbose, resetLogLevel } from "../logger.js";

/**
 * Comprehensive test to verify LOG_LEVEL configuration behavior
 *
 * This test confirms that:
 * - LOG_LEVEL=0 (Off): No logs at all
 * - LOG_LEVEL=1 (Debug): logger(), warn(), error() show, but verbose() does NOT
 * - LOG_LEVEL=2 (Verbose): All logs show including verbose()
 */

describe("Logger Log Level Configuration - Comprehensive Test", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    resetLogLevel(); // Reset log level between tests
  });

  describe("LOG_LEVEL=0 (OFF)", () => {
    beforeEach(() => {
      overrideLogLevel(LogLevel.OFF);
    });

    it("should have isVerbose() return false", () => {
      expect(isVerbose()).toBe(false);
    });

    it("should not log anything at all", () => {
      logger("This should not appear");
      verbose("This should not appear");
      warn("This should not appear");
      error("This should not appear");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should suppress all logging even with mixed messages", () => {
      for (let i = 0; i < 10; i++) {
        logger(`Debug message ${i}`);
        verbose(`Verbose message ${i}`);
        warn(`Warning ${i}`);
        error(`Error ${i}`);
      }

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("LOG_LEVEL=1 (DEBUG) - THE IMPORTANT TEST", () => {
    beforeEach(() => {
      overrideLogLevel(LogLevel.DEBUG);
    });

    it("should have isVerbose() return false", () => {
      expect(isVerbose()).toBe(false);
    });

    it("should log debug messages", () => {
      logger("Debug message appears");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("should log warnings", () => {
      warn("Warning appears");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("should log errors", () => {
      error("Error appears");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("should NOT log verbose messages - THIS IS THE KEY TEST", () => {
      verbose("This verbose message should NOT appear");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should filter out verbose but keep others", () => {
      logger("Debug 1");
      verbose("Verbose 1 - should not show");
      logger("Debug 2");
      verbose("Verbose 2 - should not show");
      warn("Warning 1");
      error("Error 1");

      // Only Debug, Warning, and Error should appear (4 calls total)
      expect(consoleLogSpy).toHaveBeenCalledTimes(4);

      const messages = consoleLogSpy.mock.calls.map((call) => call[1]);
      expect(messages).toContain("Debug 1");
      expect(messages).toContain("Debug 2");
      expect(messages).toContain("Warning 1");
      expect(messages).toContain("Error 1");
      expect(messages).not.toContain("Verbose 1 - should not show");
      expect(messages).not.toContain("Verbose 2 - should not show");
    });
  });

  describe("LOG_LEVEL=2 (VERBOSE)", () => {
    beforeEach(() => {
      overrideLogLevel(LogLevel.VERBOSE);
    });

    it("should have isVerbose() return true", () => {
      expect(isVerbose()).toBe(true);
    });

    it("should log all message types including verbose", () => {
      logger("Debug message");
      verbose("Verbose message");
      warn("Warning message");
      error("Error message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);

      const messages = consoleLogSpy.mock.calls.map((call) => call[1]);
      expect(messages).toContain("Debug message");
      expect(messages).toContain("Verbose message");
      expect(messages).toContain("Warning message");
      expect(messages).toContain("Error message");
    });

    it("should show all messages in mixed sequence", () => {
      logger("1");
      verbose("2");
      logger("3");
      warn("4");
      verbose("5");
      error("6");

      expect(consoleLogSpy).toHaveBeenCalledTimes(6);
    });
  });

  describe("Real-world scenario simulation", () => {
    it("simulates database verbose logging at DEBUG level", () => {
      overrideLogLevel(LogLevel.DEBUG);

      // Simulate what happens in db operations
      logger("Starting database operation");
      verbose("Item has expired"); // From inmem/db.ts
      verbose("Deleted item"); // From inmem/db.ts
      logger("Database operation complete");

      // At DEBUG level, verbose logs should not appear
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const messages = consoleLogSpy.mock.calls.map((call) => call[1]);
      expect(messages).toContain("Starting database operation");
      expect(messages).toContain("Database operation complete");
      expect(messages).not.toContain("Item has expired");
      expect(messages).not.toContain("Deleted item");
    });

    it("simulates GitHub service verbose logging at DEBUG level", () => {
      overrideLogLevel(LogLevel.DEBUG);

      logger("Fetching GitHub data");
      verbose("Fetching repositories with key: test-key"); // From vcsService.ts
      verbose("No quality gate manifest found"); // From github.ts
      logger("GitHub fetch complete");

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const messages = consoleLogSpy.mock.calls.map((call) => call[1]);
      expect(messages).not.toContain("Fetching repositories with key: test-key");
      expect(messages).not.toContain("No quality gate manifest found");
    });

    it("simulates the same scenarios at VERBOSE level", () => {
      overrideLogLevel(LogLevel.VERBOSE);

      // Database operations
      logger("Starting database operation");
      verbose("Item has expired");
      verbose("Deleted item");
      logger("Database operation complete");

      // GitHub operations
      logger("Fetching GitHub data");
      verbose("Fetching repositories with key: test-key");
      verbose("No quality gate manifest found");
      logger("GitHub fetch complete");

      // All 8 messages should appear
      expect(consoleLogSpy).toHaveBeenCalledTimes(8);
    });
  });

  describe("Documentation verification", () => {
    it("confirms LOG_LEVEL enum matches documentation", () => {
      expect(LogLevel.OFF).toBe(0);
      expect(LogLevel.DEBUG).toBe(1);
      expect(LogLevel.VERBOSE).toBe(2);
    });

    it("confirms .env.template documentation is accurate", () => {
      // As per .env.template:
      // set to 0 (OFF), 1 (DEBUG) or 2 (VERBOSE)

      overrideLogLevel(0); // OFF
      verbose("test");
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockClear();
      overrideLogLevel(1); // DEBUG
      verbose("test");
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockClear();
      overrideLogLevel(2); // VERBOSE
      verbose("test");
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
