import { Router } from "express";
import { validate } from "../../../middleware/validate"
import { container } from "../../../container";
import { registerSchema } from "../../../modules/auth"
import { UserService } from "../../../modules/auth/user.service"

import {
    auth,

    authorize
   
} from "../../../modules/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/

router.post(
    "/login",
    container.auth.controller.login
);

router.post(
    "/forgot-password",
    container.auth.controller.forgotPassword
);

router.post(
    "/reset-password",
    container.auth.controller.forgotPassword
);

router.post(
    "/register",
    validate(registerSchema),
    container.auth.controller.register
);

/*
|--------------------------------------------------------------------------
| Protected
|--------------------------------------------------------------------------
*/

router.get(
    "/me",
    auth,
    loadUser,
    container.auth.controller.me
);

export default router;