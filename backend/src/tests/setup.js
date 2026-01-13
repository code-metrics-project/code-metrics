const console = require("console");
global.console = console;

if (!console.configured) {
  require("log-timestamp");
  console.configured = true;
}

// maintain backward compatibility with tests that expect an error to be thrown on invalid config
process.env.STRICT_CONFIG_LOAD = "true";
