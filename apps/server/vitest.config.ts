import { defineConfig } from "vitest/config";
import { configDefaults, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
    test: {
        exclude: [
            ...configDefaults.exclude,
            "build/**"
        ],
        coverage: {
            reporter: [ "text", "html" ],
            include: ["src/**"],
            exclude: ["src/public/**"]
        }
    }
});
