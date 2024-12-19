export default class ValidationError {
    constructor(resp: Record<string, string | number>) {
        for (const key in resp) {
            (this as any)[key] = resp[key];
        }
    }
}