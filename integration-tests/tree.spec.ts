import test, { expect } from "@playwright/test";

test("Renders on desktop", async ({ page, context }) => {
    await page.goto('http://localhost:8082');
    await expect(page.locator('.tree')).toContainText('Trilium Integration Test');
});

test("Renders on mobile", async ({ page, context }) => {
    await context.addCookies([
        {
            url: "http://localhost:8082",
            name: "trilium-device",
            value: "mobile"
        }
    ]);
    await page.goto('http://localhost:8082');
    await expect(page.locator('.tree')).toContainText('Trilium Integration Test');
});