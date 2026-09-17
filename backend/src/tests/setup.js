const console = require("console");
global.console = console;

if (!console.configured) {
  require("log-timestamp");
  console.configured = true;
}

// maintain backward compatibility with tests that expect an error to be thrown on invalid config
process.env.STRICT_CONFIG_LOAD = "true";

// Clean up async query infrastructure to prevent Jest hang
afterAll(async () => {
  try {
    const cacheFactory = require("../services/queryResultCache/cacheFactory");
    if (typeof cacheFactory.destroyQueryResultCache === "function") {
      cacheFactory.destroyQueryResultCache();
    }
  } catch {
    // Module not available in some test contexts
  }
  try {
    const queueFactory = require("../services/queryQueue/queueFactory");
    if (typeof queueFactory.destroyQueryQueue === "function") {
      queueFactory.destroyQueryQueue();
    }
  } catch {
    // Module not available in some test contexts
  }
});
