import {
    Request,
    Response,
    NextFunction
} from "express";

import { AuthService } from "./auth.service";
import { devLogger } from "../../utils/dev-logger";
import { successResponse } from "../../shared/responses";
import { AppError } from "../../shared/errors";

export class AuthController {

    constructor(
        private readonly authService: AuthService
    ) { 
        

        this.register = this.register.bind(this);

        // Bind the rest
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.me = this.me.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);

    
    }


    public register = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {

            devLogger.debug("auth.controller.register: payload", req.body);

            const result = await this.authService.register(
                req.body,
                req.user
            );

          

            return res.status(201).json(

                successResponse(
                    "User registered successfully.",
                    result
                )

            );

            

        } catch (error) {

            next(error);

        }

    };


    /**
     * POST /auth/login
     */
    async login(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            const result = await this.authService.login(req.body);

            const responsePayload = {
                success: true,
                message: "Login successful.",
                data: result
            };

            devLogger.debug("auth.controller.login: response", responsePayload);

            return res.status(200).json(responsePayload);

        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/me
     */
    async me(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        if (!req.auth) {
            throw new AppError(
                401,
                "Unauthenticated."
            );
        }

        const result = await this.authService.me(req.auth.id);

        devLogger.debug("AuthController.me: result", result);

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        next(error);
    }
}

    /**
     * POST /auth/forgot-password
     */
    async forgotPassword(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            await this.authService.forgotPassword(req.body.email);

            return res.status(200).json({
                success: true,
                message: "Password reset email sent."
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/logout
     */
    async logout(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            await this.authService.logout();

            return res.status(200).json({
                success: true,
                message: "Logged out successfully."
            });

        } catch (error) {
            next(error);
        }
    }

}