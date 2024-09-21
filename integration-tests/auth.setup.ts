import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

const ROOT_URL = "http://localhost:8082";
const LOGIN_PASSWORD = "demo1234";

// Reference: https://playwright.dev/docs/auth#basic-shared-account-in-all-tests 

setup("authenticate", async ({ page }) => {
    await page.goto(ROOT_URL);
    await expect(page).toHaveURL(`${ROOT_URL}/login`);

    await page.getByRole("textbox", { name: "Password" }).fill(LOGIN_PASSWORD);
    await page.getByRole("button", { name: "Login"}).click();
    await page.context().storageState({ path: authFile });    
});