import { Request, Response, NextFunction } from "express";

import { HealthService } from "./health.service";

export class HealthController {

    constructor(
        private readonly service: HealthService
    ) {}

    check = async (

        req: Request,

        res: Response,

        next: NextFunction

    ) => {

        try {

            const result =
                await this.service.checkHealth();

            res.status(200).json(result);

        }

        catch (error) {

            next(error);

        }

    };

}