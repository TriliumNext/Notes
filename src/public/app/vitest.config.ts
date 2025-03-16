import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: ["./test/setup.ts"],
        environment: "happy-dom",
        coverage: {
            reporter: [ "text", "html" ]
        }
    }
});
