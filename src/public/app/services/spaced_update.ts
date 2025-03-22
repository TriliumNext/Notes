type Callback = () => Promise<void> | void;

export default class SpacedUpdate {
    private updater: Callback;
    private lastUpdated: number;
    private changed: boolean;
    private updateInterval: number;
    private changeForbidden?: boolean;

    constructor(updater: Callback, updateInterval = 1000) {
        this.updater = updater;
        this.lastUpdated = Date.now();
        this.changed = false;
        this.updateInterval = updateInterval;
    }

    scheduleUpdate() {
        if (!this.changeForbidden) {
            this.changed = true;
            setTimeout(() => this.triggerUpdate());
        }
    }

    async updateNowIfNecessary() {
        if (this.changed) {
            this.changed = false; // optimistic...

            try {
                await this.updater();
            } catch (e) {
                this.changed = true;

                throw e;
            }
        }
    }

    isAllSavedAndTriggerUpdate() {
        const allSaved = !this.changed;

        this.updateNowIfNecessary();

        return allSaved;
    }

    /**
     * Normally {@link scheduleUpdate()} would actually trigger the update only once per {@link updateInterval}. If the method is called 200 times within 20s, it will execute only 20 times.
     * Sometimes, if the updates are continuous this would cause a performance impact. Resetting the time ensures that the calls to {@link triggerUpdate} have stopped before actually triggering an update.
     */
    resetUpdateTimer() {
        this.lastUpdated = Date.now();
    }

    triggerUpdate() {
        if (!this.changed) {
            return;
        }

        if (Date.now() - this.lastUpdated > this.updateInterval) {
            this.updater();
            this.lastUpdated = Date.now();
            this.changed = false;
        } else {
            // update isn't triggered but changes are still pending, so we need to schedule another check
            this.scheduleUpdate();
        }
    }

    async allowUpdateWithoutChange(callback: Callback) {
        this.changeForbidden = true;

        try {
            await callback();
        } finally {
            this.changeForbidden = false;
        }
    }
}
