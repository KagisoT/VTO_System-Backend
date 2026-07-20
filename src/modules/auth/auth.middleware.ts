import {
    Request,
    Response,
    NextFunction
} from "express";

import { supabaseAuth } from "../config";
import { AppError } from "../shared/errors";

export async function auth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new AppError(401, "Authorization header missing.");
        }

        if (!authHeader.startsWith("Bearer ")) {
            throw new AppError(401, "Invalid authorization header.");
        }

        const token = authHeader.substring(7);

        const { data, error } = await supabaseAuth.auth.getUser(token);

        if (error || !data.user) {
            throw new AppError(401, "Invalid access token.");
        }

        req.auth = {
            id: data.user.id,
            email: data.user.email ?? ""
        };

        next();

    } catch (error) {
        next(error);
    }
}