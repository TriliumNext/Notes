
import server from "./server.js";

type OptionValue = string | number;

class Options {
    initializedPromise: Promise<void>;
    private arr!: Record<string, OptionValue>;

    constructor() {
        this.initializedPromise = server.get<Record<string, OptionValue>>('options').then(data => this.load(data));
    }

    load(arr: Record<string, OptionValue>) {
        this.arr = arr;
    }

    get(key: string) {
        return this.arr?.[key];
    }

    getNames() {
        return Object.keys(this.arr || []);
    }

    getJson(key: string) {                
        const value = this.arr?.[key];
        if (typeof value !== "string") {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch (e) {
            return null;
        }
    }

    getInt(key: string) {
        const value = this.arr?.[key];
        if (typeof value !== "string") {
            return null;
        }
        return parseInt(value);
    }

    getFloat(key: string) {
        const value = this.arr?.[key];
        if (typeof value !== "string") {
            return null;
        }
        return parseFloat(value);
    }

    is(key: string) {
        return this.arr[key] === 'true';
    }

    set(key: string, value: OptionValue) {
        this.arr[key] = value;
    }

    async save(key: string, value: OptionValue) {
        this.set(key, value);

        const payload: Record<string, OptionValue> = {};
        payload[key] = value;

        await server.put(`options`, payload);
    }

    async toggle(key: string) {
        await this.save(key, (!this.is(key)).toString());
    }
}

const options = new Options();

export default options;