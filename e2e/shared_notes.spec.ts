import { test, expect, Page } from "@playwright/test";
import App from "./support/app";

test("Goes to share root", async ({ page, context }) => {
    const app = new App(page, context);
    await app.goto({ url: "/share" });
    const noteTitle = "Shared notes";
    await expect(page).toHaveTitle(noteTitle);
    await expect(page.locator("h1")).toHaveText(noteTitle);
});

test("Goes to parent share root page", async ({ page, context }) => {
    const app = new App(page, context);
    await app.goto({ url: "/share/bKMn5EFv9KS2" });
    await expect(page.locator("h1")).toHaveText("Child note");
    await page.locator("#parentLink a").click();
    await page.waitForURL("/share/");
});
