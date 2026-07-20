import {

    Request,

    Response,

    NextFunction

} from "express";

import { logger } from "../config/logger";

export function errorHandler(

    err: any,

    req: Request,

    res: Response,

    next: NextFunction

) {

    logger.error(err.message);

    res.status(err.status || 500).json({

        success: false,

        message:

            err.message ||

            "Internal Server Error"

    });

}