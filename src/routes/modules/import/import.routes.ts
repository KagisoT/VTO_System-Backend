import { Router } from "express";

import { container } from "../../../container";

import { auth } from "../../../modules/auth/auth.middleware";
import { createLoadUserMiddleware } from "../../../modules/auth/load-user.middleware";


const router = Router();

const loadUser =
    createLoadUserMiddleware(
        container.services.auth
    );


router.post(
    "/validate",
    auth,
    loadUser,
    container.controllers.import.validate
);

router.post(
    "/commit",
    auth,
    loadUser,
    container.controllers.import.commit
);


export default router;