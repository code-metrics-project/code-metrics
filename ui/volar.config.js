import { resolve } from "path";

export const projects = [
  {
    // The root of your Vue project
    root: resolve(__dirname),
    // The location of your package.json
    package: resolve(__dirname, "package.json"),
    // The location of your tsconfig.json (or jsconfig.json)
    tsconfig: resolve(__dirname, "tsconfig.app.json"),
    // Optional: Where global components are located
    globalComponents: [resolve(__dirname, "src/components/**/*.vue")],
  },
];
