/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
    plugins: [
        svelte({})
    ],
    test: {
        name: "@spirex/di-svelte",
        root: "./src",
        environment: 'jsdom',
        include: ["**/*.{test,spec}.(c|m)js"],
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
        },
        testTimeout: 200,
        clearMocks: true,
    },
});
