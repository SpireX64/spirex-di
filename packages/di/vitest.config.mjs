/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@spirex/di",
        root: "./src",
        include: ["**/*.{test,spec}.{js,cjs,mjs}"],
        exclude: [
            "**/node_modules/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{rollup,vitest,eslint,prettier}.config.*",
            "**/{dist,coverage}/**",
            "**/__test__/*.{test,spec}.{js,cjs,mjs}",
        ],
        coverage: {
            provider: "istanbul",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "../coverage",
            exclude: ["**/*.{test,spec}.{js,cjs,mjs}", "**/__tests__/**"],
        },
        testTimeout: 200,
        clearMocks: true,
    },
});
