import { test, expect } from "@playwright/test";
import App from "../support/app";

const NOTE_TITLE = "Trilium Integration Test DB";

test("Can drag tabs around", async ({ page, context }) => {
    const app = new App(page, context);
    await app.goto();

    // [1]: Trilium Integration Test DB note
    await app.closeAllTabs();
    await app.clickNoteOnNoteTreeByTitle(NOTE_TITLE);
    await expect(app.getActiveTab()).toContainText(NOTE_TITLE);

    // [1] [2] [3]
    await app.addNewTab();
    await app.addNewTab();

    let tab = app.getTab(0);

    // Drag the first tab at the end
    await tab.dragTo(app.getTab(2), { targetPosition: { x: 50, y: 0 }});

    tab = app.getTab(2);
    await expect(tab).toContainText(NOTE_TITLE);

    // Drag the tab to the left
    await tab.dragTo(app.getTab(0), { targetPosition: { x: 50, y: 0 }});
    await expect(app.getTab(0)).toContainText(NOTE_TITLE);
});

test("Can drag tab to new window", async ({ page, context }) => {
    const app = new App(page, context);
    await app.goto();

    await app.closeAllTabs();
    await app.clickNoteOnNoteTreeByTitle(NOTE_TITLE);
    const tab = app.getTab(0);
    await expect(tab).toContainText(NOTE_TITLE);

    const popupPromise = page.waitForEvent("popup");

    const tabPos = await tab.boundingBox();
    if (tabPos) {
        const x = tabPos.x + tabPos.width / 2;
        const y = tabPos.y + tabPos.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y + tabPos.height + 100, { steps: 5 });
        await page.mouse.up();
    } else {
        test.fail(true, "Unable to determine tab position");
    }

    // Wait for the popup to show
    const popup = await popupPromise;
    const popupApp = new App(popup, context);
    await expect(popupApp.getActiveTab()).toHaveText(NOTE_TITLE);
});
