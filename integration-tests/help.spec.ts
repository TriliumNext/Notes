import test, { expect } from "@playwright/test";

test('Help popup', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.getByText('Trilium Integration Test DB').click();

    await page.locator('body').press('F1');
    await page.getByRole('link', { name: 'online↗' }).click();
    expect((await page.waitForEvent('popup')).url()).toBe("https://triliumnext.github.io/Docs/")
});

test('Complete help in search', async ({ page }) => {
    await page.goto('http://localhost:8082');

    // Clear all tabs
    await page.locator('.note-tab:first-of-type').locator("div").nth(1).click({ button: 'right' });
    await page.getByText('Close all tabs').click();

    await page.locator('#launcher-container').getByRole('button', { name: '' }).first().click();
    await page.getByRole('cell', { name: ' ' }).locator('span').first().click();
    await page.getByRole('button', { name: 'complete help on search syntax' }).click();    
    expect((await page.waitForEvent('popup')).url()).toBe("https://triliumnext.github.io/Docs/Wiki/search.html");
});