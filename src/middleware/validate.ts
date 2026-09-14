import {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    ZodType,
    ZodError,
} from "zod";

import { AppError } from "../shared/errors";

export function validate(schema: ZodType) {

    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {

            await schema.parseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
                headers: req.headers,
            });

            next();

        } catch (error) {

            if (error instanceof ZodError) {

                console.error(
                    "VALIDATION FAILED:",
                    error.issues
                );

                return next(
                    new AppError(
                        400,
                        "Validation failed.",
                        error.issues.map(issue => ({
                            field: issue.path.join("."),
                            message: issue.message,
                            code: issue.code,
                        }))
                    )
                );

            }

            next(error);

        }

    };

}