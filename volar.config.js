import { resolve } from "path";

export const projects = [
    {
        // The root of your Vue project
        root: resolve(__dirname, "ui"),
        // The location of your package.json
        package: resolve(__dirname, "ui/package.json"),
        // The location of your tsconfig.json (or jsconfig.json)
        tsconfig: resolve(__dirname, "ui/tsconfig.app.json"),
        // Optional: Where global components are located
        globalComponents: [resolve(__dirname, "ui/src/components/**/*.vue")],
    },
];
