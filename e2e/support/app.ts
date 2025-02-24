import { expect, Locator, Page } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";

interface GotoOpts {
    url?: string;
    isMobile?: boolean;
}

const BASE_URL = "http://127.0.0.1:8082";

export default class App {
    readonly page: Page;
    readonly context: BrowserContext;

    readonly tabBar: Locator;
    readonly noteTree: Locator;
    readonly launcherBar: Locator;
    readonly currentNoteSplit: Locator;
    readonly sidebar: Locator;

    constructor(page: Page, context: BrowserContext) {
        this.page = page;
        this.context = context;

        this.tabBar = page.locator(".tab-row-widget-container");
        this.noteTree = page.locator(".tree-wrapper");
        this.launcherBar = page.locator("#launcher-container");
        this.currentNoteSplit = page.locator(".note-split:not(.hidden-ext)")
        this.sidebar = page.locator("#right-pane");
    }

    async goto({ url, isMobile }: GotoOpts = {}) {
        await this.context.addCookies([
            {
                url: BASE_URL,
                name: "trilium-device",
                value: isMobile ? "mobile" : "desktop"
            }
        ]);

        if (!url) {
            url = "/";
        }

        await this.page.goto(url, { waitUntil: "networkidle" });

        // Wait for the page to load.
        if (url === "/") {
            await expect(this.page.locator(".tree"))
                .toContainText("Trilium Integration Test");
            await this.closeAllTabs();
        }
    }

    async goToNoteInNewTab(noteTitle: string) {
        const autocomplete = this.currentNoteSplit.locator(".note-autocomplete");
        await autocomplete.fill(noteTitle);
        await autocomplete.press("ArrowDown");
        await autocomplete.press("Enter");
    }

    async goToSettings() {
        await this.page.locator(".launcher-button.bx-cog").click();
    }

    getTab(tabIndex: number) {
        return this.tabBar.locator(".note-tab-wrapper").nth(tabIndex);
    }

    getActiveTab() {
        return this.tabBar.locator(".note-tab[active]");
    }

    /**
     * Closes all the tabs in the client by issuing a command.
     */
    async closeAllTabs() {
        await this.triggerCommand("closeAllTabs");
    }

    /**
     * Adds a new tab by cliking on the + button near the tab bar.
     */
    async addNewTab() {
        await this.page.locator('[data-trigger-command="openNewTab"]').click();
    }

    /**
     * Looks for a given title in the note tree and clicks on it. Useful for selecting option pages in settings in a similar fashion as the user.
     * @param title the title of the note to click, as displayed in the note tree.
     */
    async clickNoteOnNoteTreeByTitle(title: string) {
        await this.noteTree.getByText(title).click();
    }

    /**
     * Executes any Trilium command on the client.
     * @param command the command to send.
     */
    async triggerCommand(command: string) {
        await this.page.evaluate(async (command: string) => {
            await (window as any).glob.appContext.triggerCommand(command);
        }, command);
    }

    async setOption(key: string, value: string) {
        const csrfToken = await this.page.evaluate(() => {
            return (window as any).glob.csrfToken;
        });

        expect(csrfToken).toBeTruthy();
        await expect(await this.page.request.put(`${BASE_URL}/api/options/${key}/${value}`, {
            headers: {
                "x-csrf-token": csrfToken
            }
        })).toBeOK();
    }

}
