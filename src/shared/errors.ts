export class AppError extends Error {

    public readonly status: number;
    public readonly details?: unknown;

    constructor(
        status: number,
        message: string,
        details?: unknown
    ) {
        super(message);

        this.name = "AppError";
        this.status = status;
        this.details = details;

        // Restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype);

        // Better stack traces
        Error.captureStackTrace?.(this, this.constructor);
    }

}