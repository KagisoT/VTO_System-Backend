import { Request, Response, NextFunction } from "express";

import { logger } from "../config/logger";

export function requestLogger(

    req: Request,

    res: Response,

    next: NextFunction

) {

    logger.info(

        `${req.method} ${req.originalUrl}`

    );

    next();

}