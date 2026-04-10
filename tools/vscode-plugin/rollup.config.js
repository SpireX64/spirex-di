const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");
const copy = require("rollup-plugin-copy");
const path = require("path");

const outDir = "./dist";

exports.default = [
    {
        input: "./src/extension.ts",
        output: {
            file: `${outDir}/extension.js`,
            format: "cjs",
            sourcemap: true,
            generatedCode: {
                constBindings: false,
                objectShorthand: true,
            },
        },
        external: ["vscode"],
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs(),
            json(),
            typescript({ tsconfig: "./tsconfig.json" }),
            copy({
                targets: [
                    {
                        src: path.dirname(require.resolve("cytoscape/dist/cytoscape.min.js")) + "/cytoscape.min.js",
                        dest: outDir,
                    },
                ],
                hook: "writeBundle",
            }),
        ],
    },
    {
        input: "./src/vendor/cose-bilkent-bundle.js",
        output: {
            file: `${outDir}/cytoscape-cose-bilkent.js`,
            format: "iife",
            name: "cytoscapeCoseBilkent",
            globals: { cytoscape: "cytoscape" },
        },
        external: ["cytoscape"],
        plugins: [
            resolve({ preferBuiltins: false }),
            commonjs(),
        ],
    },
];
