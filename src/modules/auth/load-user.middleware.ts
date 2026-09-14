import {
    Request,
    Response,
    NextFunction
} from "express";

import { AuthService } from "./auth.service";
import { AppError } from "../../shared/errors";
import { devLogger } from "../../utils/dev-logger";

export function createLoadUserMiddleware(
    authService: AuthService
) {

    return async (

        req: Request,
        res: Response,
        next: NextFunction

    ) => {

        try {

            if (!req.auth) {

                throw new AppError(
                    401,
                    "Unauthenticated."
                );

            }

            devLogger.debug("loadUser middleware: start", {
                authId: req.auth.id,
                authEmail: req.auth.email,
                url: req.originalUrl
            });

            req.user =
                await authService.me(req.auth.id);

            devLogger.debug("loadUser middleware: completed", {
                authId: req.auth.id,
                userId: req.user?.id,
                roleId: req.user?.roleId,
                permissionsCount: req.user?.permissions.length ?? 0
            });

            next();

        }

        catch (error) {

            devLogger.error("loadUser middleware error", error);

            next(error);

        }

    };

}