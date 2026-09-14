import { Router } from "express";

import authRoutes from "./modules/auth/auth.routes";
import healthRoutes from "./modules/health/health.routes";
import debtRoutes from "./modules/debt/debt.routes";
import importRoutes from "./modules/import/import.routes";

import internalRoutes from "./internal";

const router = Router();

/*
|--------------------------------------------------------------------------
| Internal
|--------------------------------------------------------------------------
*/

router.use(
    "/internal",
    internalRoutes
);

router.use(
    "/auth",
    authRoutes
);

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

router.use(
    "/health",
    healthRoutes
);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(
    "/auth",
    authRoutes
);

/* 
---------------------------------------------------------------------------
Debt
---------------------------------------------------------------------------
*/

router.use(
    "/debt",
    debtRoutes
);

/*
|--------------------------------------------------------------------------
| Import 
|--------------------------------------------------------------------------
*/

router.use(
    "/import",
    importRoutes
);

export default router;