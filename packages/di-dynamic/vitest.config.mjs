/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@spirex/di-dynamic",
        root: "./src",
        include: ["**/*.{test,spec}.(c|m)js"],
        exclude: [
            "**/node_modules/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{rollup,vitest,eslint,prettier}.config.*",
            "**/{build,docs,coverage}/**",
            "**/__test__/*.{test,spec}.(c|m)js",
        ],
        coverage: {
            provider: "istanbul",
            reporter: ["text", "json", "html"],
            reportsDirectory: "../coverage",
        },
        testTimeout: 200,
        clearMocks: true,
    },
});
