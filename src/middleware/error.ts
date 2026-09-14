import { Request, Response, NextFunction } from "express";

import { AppError } from "../shared/errors";
import { errorResponse } from "../shared/responses";

export function errorHandler(

    error: Error,
    req: Request,
    res: Response,
    next: NextFunction

) {

    if (error instanceof AppError) {

        return res.status(error.status).json(

            errorResponse(
                error.message,
                error.message
            )

        );

    }

    console.error(error);

    return res.status(500).json(

        errorResponse(
            "Internal Server Error",
            error.message
        )

    );

}