import {
    Request,
    Response,
    NextFunction
} from "express";

import { AppError } from "../../shared/errors";
import { devLogger } from "../../utils/dev-logger";

export function authorize(
    ...requiredPermissions: string[]
) {

    return (

        req: Request,

        res: Response,

        next: NextFunction

    ) => {

        devLogger.debug("authorize middleware: start", {
            requiredPermissions,
            userId: req.user?.id
        });

        if (!req.user)
            throw new AppError(
                401,
                "Unauthenticated."
            );

        const allowed =
            requiredPermissions.every(

                permission =>

                    req.user!.permissions.includes(
                        permission
                    )

            );

        if (!allowed)
            throw new AppError(
                403,
                "Access denied."
            );

        devLogger.debug("authorize middleware: completed", {
            userId: req.user.id,
            requiredPermissions,
            allowed
        });

        next();

    };

}