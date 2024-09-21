import { test, expect } from '@playwright/test';

test("Can duplicate note with broken links", async ({ page }) => {
    await page.goto(`http://localhost:8082/#2VammGGdG6Ie`);
    await page.locator('.tree-wrapper .fancytree-active').getByText('Note map').click({ button: 'right' });
    await page.getByText('Duplicate subtree').click();    
    await expect(page.locator(".toast-body")).toBeHidden();
    await expect(page.locator('.tree-wrapper').getByText('Note map (dup)')).toBeVisible();
});