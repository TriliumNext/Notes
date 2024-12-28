export default class Mutex {
    private current: Promise<void>;

    constructor() {
        this.current = Promise.resolve();
    }

    lock() {
        let resolveFun: () => void;
        const subPromise = new Promise<void>(resolve => resolveFun = () => resolve());
        // Caller gets a promise that resolves when the current outstanding lock resolves
        const newPromise = this.current.then(() => resolveFun);
        // Don't allow the next request until the new promise is done
        this.current = subPromise;
        // Return the new promise
        return newPromise;
    };

    async runExclusively(cb: () => Promise<void>) {
        const unlock = await this.lock();

        try {
            return await cb();
        }
        finally {
            unlock();
        }
    }
}
