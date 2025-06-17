const console = require("console");
global.console = console;

if (!console.configured) {
  require("log-timestamp");
  console.configured = true;
}
