/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@spirex/di-shared",
        root: "./src",
        environment: "node",
        include: ["**/*.{test,spec}.{js,mjs,cjs}"],
        exclude: [
            "**/node_modules/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{rollup,vitest,eslint,prettier}.config.*",
            "**/{dist,coverage}/**",
        ],
        coverage: {
            provider: "istanbul",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "../coverage",
            include: ["**/*.js"],
            exclude: ["**/*.test.*", "**/*.spec.*"],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
            },
        },
        testTimeout: 5000,
        clearMocks: true,
    },
});
