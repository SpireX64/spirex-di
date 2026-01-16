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

exports.default = [
    {
        input: sourceFile,
        output: {
            file: `${output}.js`,
            format: "es",
            generatedCode,
        },
        plugins: [terserPlugin],
    },
    {
        input: sourceFile,
        output: {
            file: `${output}.cjs`,
            format: "cjs",
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
