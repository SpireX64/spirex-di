const { terser } = require("rollup-plugin-terser");
const copy = require("rollup-plugin-copy");

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
const sourceFile = `${sourceDir}/index.js`;
const outDir = "./dist";
const output = `${outDir}/index`;

const generatedCode = {
    constBindings: false,
    objectShorthand: true,
    moduleSideEffects: false,
};

const solidExternal = ["solid-js"];

exports.default = [
    {
        input: sourceFile,
        external: solidExternal,
        output: {
            name: "DISolid",
            file: `${output}.js`,
            format: "umd",
            sourcemap: release ? false : "inline",
            generatedCode,
            globals: {
                "solid-js": "Solid",
            },
        },
        plugins: [terserPlugin],
    },
    {
        input: sourceFile,
        external: solidExternal,
        output: {
            file: `${output}.mjs`,
            format: "es",
            generatedCode,
        },
        plugins: [
            terserPlugin,
            copy({
                targets: [
                    {
                        src: `${sourceDir}/index.d.ts`,
                        dest: outDir,
                    },
                ],
            }),
        ],
    },
];
