import { defineConfig } from "vitest/config";
import { configDefaults } from "vitest/config";

export default defineConfig({
    test: {
        exclude: [
            ...configDefaults.exclude,
            "build/**",
        ],
        setupFiles: ["./spec/setup.ts"],
        environment: "happy-dom",
        coverage: {
            reporter: [ "text", "html" ],
        }
    }
});
