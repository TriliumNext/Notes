import { test, expect } from '@playwright/test';

const expectedVersion = "0.90.3";

test("Displays update badge when there is a version available", async ({ page }) => {
    await page.goto("http://localhost:8080");
    await page.getByRole('button', { name: '' }).click();
    await page.getByText(`Version ${expectedVersion} is available,`).click();

    const page1 = await page.waitForEvent('popup');
    expect(page1.url()).toBe(`https://github.com/TriliumNext/Notes/releases/tag/v${expectedVersion}`);
});