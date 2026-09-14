import {
    Request,
    Response,
    NextFunction
} from "express";

import { supabaseAuth } from "../../config/supabase-auth";
import { AppError } from "../../shared/errors";
import { devLogger } from "../../utils/dev-logger";

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

        devLogger.debug("auth middleware: incoming request", {
            method: req.method,
            url: req.originalUrl,
            authHeaderType: authHeader.slice(0, 6),
            tokenPreview: token.slice(0, 10) + "..."
        });

        const { data, error } = await supabaseAuth.auth.getUser(token);

        devLogger.debug("auth middleware: supabase.getUser returned", {
            userId: data.user?.id,
            email: data.user?.email,
            error: error?.message
        });

        if (error || !data.user) {
            throw new AppError(401, "Invalid access token.Kodwa nawe!");
        }

        req.auth = {
            id: data.user.id,
            email: data.user.email ?? ""
        };

        devLogger.debug("auth middleware: auth succeeded", req.auth);
        next();

    } catch (error) {
        devLogger.error("auth middleware error", error);
        next(error);
    }
}