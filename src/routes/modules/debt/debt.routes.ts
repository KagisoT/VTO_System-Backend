import { Router } from "express";

import { container, loadUser } from "../../../container";

import { auth } from "../../../modules/auth";
import { createLoadUserMiddleware } from "../../../modules/auth/load-user.middleware";
import { authorize } from "../../../modules/auth/authorise.middleware";
import { PERMISSIONS } from "../../../modules/auth/constants/permissions";
import { validate } from "../../../middleware/validate";

import {
    createDebtSchema,
    debtIdSchema,
    updateDebtStatusSchema,
    assignDebtSchema,
    updateDebtBalanceSchema,
    updateDebtNotesSchema
} from "../../../modules/debts/debt.schemas";

const router = Router();

const controller =
    container.controllers.debt;

/*
|--------------------------------------------------------------------------
| Create Debt
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_CREATE),
    validate(createDebtSchema),
    controller.create
);

router.get(
    "/",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_READ_ALL),
    controller.findAll
);

/*
|--------------------------------------------------------------------------
| Get All Debts
|--------------------------------------------------------------------------
*/

router.get(
    "/assigned",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_READ_ASSIGNED),
    controller.findAll
);

/*
|--------------------------------------------------------------------------
| Get Debt By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_READ_ASSIGNED),
    validate(debtIdSchema),
    controller.findById
);

/*
|--------------------------------------------------------------------------
| Update Status
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/status",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_UPDATE_STATUS),
    validate(debtIdSchema),
    validate(updateDebtStatusSchema),
    controller.updateStatus
);

/*
|--------------------------------------------------------------------------
| Assign Debt
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/assignment",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_ASSIGN),
    validate(debtIdSchema),
    validate(assignDebtSchema),
    controller.assignDebt
);

/*
|--------------------------------------------------------------------------
| Update Balance
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/balance",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_UPDATE_BALANCE),
    validate(debtIdSchema),
    validate(updateDebtBalanceSchema),
    controller.updateBalance
);

/*
|--------------------------------------------------------------------------
| Update Notes
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/notes",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_UPDATE_NOTES),
    validate(debtIdSchema),
    validate(updateDebtNotesSchema),
    controller.updateNotes
);

/*
|--------------------------------------------------------------------------
| Delete Debt
|--------------------------------------------------------------------------
*/

router.delete(
    "/:id",
    auth,
    createLoadUserMiddleware(container.services.auth),
    authorize(PERMISSIONS.DEBT_DELETE),
    validate(debtIdSchema),
    controller.delete
);

export default router;