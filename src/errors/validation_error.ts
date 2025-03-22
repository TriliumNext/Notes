import HttpError from "./http_error.js";

class ValidationError extends HttpError {

    constructor(message: string) {
        super(message, 400)
        this.name = "ValidationError";
    }

}

export default ValidationError;
