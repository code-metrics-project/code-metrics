import * as esbuild from "esbuild";
import { spawn } from "child_process";
import commandLineArgs from "command-line-args";

const options = commandLineArgs([
  { name: "debug", alias: "d", type: Boolean },
  { name: "watch", alias: "w", type: Boolean },
]);

const OUTPUT_FILE = "./dist/index.js";

let projectRunner;

const runProject = () => {
  projectRunner && projectRunner.kill("SIGINT");
  projectRunner = spawn("node", [OUTPUT_FILE]);
  projectRunner.stdout.on("data", (data) => {
    console.log(data.toString());
  });
  projectRunner.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });
  projectRunner.on("close", () => {
    console.log(`Restarting project...`);
  });
};

const plugins = [
  {
    name: "rebuild",
    setup(build) {
      let count = 0;
      build.onEnd((result) => {
        if (count++ === 0) console.log("Initial build:", result);
        else console.log("Rebuild:", result);
        runProject();
      });
    },
  },
];

const buildOptions = {
  bundle: true,
  entryPoints: ["./src/index.ts"],
  minify: !options.watch && !options.debug,
  outfile: OUTPUT_FILE,
  sourcemap: true,
  treeShaking: true,
  platform: "node",
};

if (options.watch) {
  const ctx = await esbuild.context({
    ...buildOptions,
    plugins,
  });
  console.log("Watching...");
  await ctx.watch();
} else {
  await esbuild.build(buildOptions);
}
