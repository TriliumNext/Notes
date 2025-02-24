import { defineConfig } from "vitest/config";
import { configDefaults, coverageConfigDefaults } from "vitest/config";

const customExcludes = [
    "build/**",
    "e2e/**",
    "integration-tests/**",
    "tests-examples/**",
    "node_modules/**",
    "src/public/app-dist/**",
    "libraries/**",
    "docs/**",
    "out/**",
    "*.config.[jt]s" // playwright.config.ts and similar
];

export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, ...customExcludes],
        coverage: {
            exclude: [...coverageConfigDefaults.exclude, ...customExcludes]
        }
    }
});
