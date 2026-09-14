import { Router } from "express";

import { container, loadUser } from "../container";

import { auth } from "../modules/auth";
import { createLoadUserMiddleware } from "../modules/auth/load-user.middleware";
import { authorize } from "../modules/auth/authorise.middleware";
import { PERMISSIONS } from "../modules/auth/constants/permissions";


const router = Router();

// ==========================================================
// EMPLOYEES
// ==========================================================

router.get(
    "/employees",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.EMPLOYEE_READ),
    container.controllers.employee.getEmployees.bind(
    container.controllers.employee
    )
);

router.get("/ping", (_, res) => {

    res.json({

        success: true,

        message: "pong"

    });

});



export default router;