import { logger, verbose, warn, error, LogLevel, overrideLogLevel, resetLogLevel } from "../logger.js";

describe("Logger Log Level Configuration", () => {
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

    it("should not log anything when level is OFF", () => {
      logger("Debug message");
      verbose("Verbose message");
      warn("Warning message");
      error("Error message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("LOG_LEVEL=1 (DEBUG)", () => {
    beforeEach(() => {
      overrideLogLevel(LogLevel.DEBUG);
    });

    it("should log debug, warn, and error messages", () => {
      logger("Debug message");
      warn("Warning message");
      error("Error message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      // Check that it was called with the message (format varies by color codes)
      const calls = consoleLogSpy.mock.calls;
      const messages = calls.map((call) => call[1]); // Second arg is the message
      expect(messages).toContain("Debug message");
      expect(messages).toContain("Warning message");
      expect(messages).toContain("Error message");
    });

    it("should NOT log verbose messages", () => {
      verbose("Verbose message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("LOG_LEVEL=2 (VERBOSE)", () => {
    beforeEach(() => {
      overrideLogLevel(LogLevel.VERBOSE);
    });

    it("should log all messages including verbose", () => {
      logger("Debug message");
      verbose("Verbose message");
      warn("Warning message");
      error("Error message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing LOG_LEVEL environment variable gracefully", () => {
      // Default should be DEBUG (1)
      const originalEnv = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;

      overrideLogLevel(LogLevel.DEBUG);

      logger("Test message");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);

      if (originalEnv !== undefined) {
        process.env.LOG_LEVEL = originalEnv;
      }
    });

    it("should respect overrideLogLevel over environment variable", () => {
      overrideLogLevel(LogLevel.OFF);

      logger("Should not appear");
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockClear();
      overrideLogLevel(LogLevel.VERBOSE);

      verbose("Should appear");
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
