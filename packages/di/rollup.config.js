const { terser } = require("rollup-plugin-terser");
const { default: typescript } = require("@rollup/plugin-typescript");

const release = process.env.NODE_ENV === "production";

const terserPlugin =
    release &&
    terser({
        ecma: 2015,
        compress: {
            module: true,
            toplevel: true,
            drop_console: true,
            drop_debugger: true,
        },
    });

const sourceDir = "./src";
const sourceFile = `${sourceDir}/index.ts`;
const outDir = "./build";
const output = `${outDir}/index`;

exports.default = [
    {
        input: sourceFile,
        output: {
            name: "DI",
            file: `${output}.js`,
            format: "umd",
            sourcemap: release ? false : "inline",
        },
        plugins: [typescript(), terserPlugin],
    },
    {
        input: sourceFile,
        output: {
            file: `${output}.mjs`,
            format: "es",
        },
        plugins: [
            typescript({
                declaration: true,
                declarationDir: outDir,
                exclude: `${sourceDir}/*.test.ts`,
            }),
            terserPlugin,
        ],
    },
    {
        input: sourceFile,
        output: {
            file: `${output}.cjs`,
            format: "cjs",
        },
        plugins: [typescript(), terserPlugin],
    },
];
