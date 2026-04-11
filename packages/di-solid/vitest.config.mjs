/// <reference types="vitest" />
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [solid()],
    test: {
        name: "@spirex/di-solid",
        root: "./src",
        environment: "jsdom",
        include: ["**/*.{test,spec}.{js,mjs,cjs,jsx,tsx}"],
        exclude: [
            "**/node_modules/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{rollup,vitest,eslint,prettier}.config.*",
            "**/{dist,coverage}/**",
            "**/__test__/*.{test,spec}.(c|m)js",
        ],
        coverage: {
            provider: "istanbul",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "../coverage",
            include: ["**/*.js", "**/*.jsx"],
            exclude: ["**/*.test.*", "**/*.spec.*"],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
            },
        },
        testTimeout: 200,
        clearMocks: true,
    },
});
