import { test, expect, Page } from "@playwright/test";
import App from "./support/app";

test("Help popup", async ({ page, context }) => {
    page.setDefaultTimeout(15_000);

    const app = new App(page, context);
    await app.goto();

    const popupPromise = page.waitForEvent("popup");
    await app.currentNoteSplit.press("Shift+F1");
    await page.getByRole("link", { name: "online" }).click();
    const popup = await popupPromise;
    expect(popup.url()).toBe("https://triliumnext.github.io/Docs/");
});

test("Complete help in search", async ({ page, context }) => {
    const app = new App(page, context);
    await app.goto();

    await app.launcherBar.locator(".bx-search").first().click();
    await app.currentNoteSplit.locator(".search-settings .bx-help-circle").click();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "complete help on search syntax" }).click();
    const popup = await popupPromise;
    expect(popup.url()).toBe("https://triliumnext.github.io/Docs/Wiki/search.html");
});
