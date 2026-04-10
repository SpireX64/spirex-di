/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@spirex/eslint-plugin-di",
        root: "./tests",
        include: ["**/*.{test,spec}.{ts,mts}"],
        exclude: ["**/node_modules/**", "**/{dist,coverage}/**"],
        coverage: {
            provider: "istanbul",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "../coverage",
        },
        testTimeout: 500,
        clearMocks: true,
    },
});
