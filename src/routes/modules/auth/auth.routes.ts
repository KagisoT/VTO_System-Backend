import { Router } from "express";

import { container } from "../../../container";

import { validate } from "../../../middleware/validate";

import {
    auth,
    authorize,
    createLoadUserMiddleware,
    registerSchema
} from "../../../modules/auth";
import { PERMISSIONS } from "../../../modules/auth/constants/permissions";

const router = Router();

const loadUser =
    createLoadUserMiddleware(
        container.services.auth
    );

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/

router.get(
    "/me",
    auth,
    loadUser,
    container.controllers.auth.me
);

router.post(
    "/register",
    validate(registerSchema),
    container.controllers.auth.register
);

router.post(
    "/register/admin",
    auth,
    loadUser,
    authorize(PERMISSIONS.ROLES_CREATE),
    validate(registerSchema),
    container.controllers.auth.register
);

router.post(
    "/login",
    container.controllers.auth.login
);

router.post(
    "/forgot-password",
    container.controllers.auth.forgotPassword
);

router.post(
    "/reset-password",
    container.controllers.auth.forgotPassword
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
    container.controllers.auth.me
);

export default router;