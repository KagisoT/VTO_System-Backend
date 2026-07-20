import { Router } from "express";

import { container } from "../container";

const router = Router();

router.get(

    "/health",

    container.controllers.health.check

);

export default router;