export default class ValidationError {
    constructor(resp: Record<string, unknown>) {
        for (const key in resp) {
            (this as any)[key] = resp[key];
        }
    }
}