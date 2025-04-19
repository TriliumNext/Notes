class HttpError extends Error {

    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
    }

}

export default HttpError;