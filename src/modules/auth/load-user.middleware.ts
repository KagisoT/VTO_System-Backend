import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { AppError } from "../../shared/errors";

export function createLoadUserMiddleware(
    userService: UserService
) {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!req.auth) {
                throw new AppError(401, "Unauthenticated.");
            }

            req.user = await userService.loadCurrentUser(req.auth.id);

            next();
        } catch (error) {
            next(error);
        }
    };
}