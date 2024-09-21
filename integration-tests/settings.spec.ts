import test, { expect } from "@playwright/test";

test("Native Title Bar not displayed on web", async ({ page }) => {
    await page.goto('http://localhost:8082/#root/_hidden/_options/_optionsAppearance');
    await expect(page.getByRole('heading', { name: 'Theme' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Native Title Bar (requires' })).toBeHidden();
});

test("Tray settings not displayed on web", async ({ page }) => {
    await page.goto('http://localhost:8082/#root/_hidden/_options/_optionsOther');
    await expect(page.getByRole('heading', { name: 'Note Erasure Timeout' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tray' })).toBeHidden();
});

test("Spellcheck settings not displayed on web", async ({ page }) => {
    await page.goto('http://localhost:8082/#root/_hidden/_options/_optionsSpellcheck');
    await expect(page.getByRole('heading', { name: 'Spell Check' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tray' })).toBeHidden();
    await expect(page.getByText('These options apply only for desktop builds')).toBeVisible();
    await expect(page.getByText('Enable spellcheck')).toBeHidden();
});