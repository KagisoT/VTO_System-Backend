import { Router } from "express";
import { auth } from "../../../modules/auth/auth.middleware";
import { createLoadUserMiddleware } from "../../../modules/auth/load-user.middleware";
import { authorize } from "../../../modules/auth/authorise.middleware";
import { PERMISSIONS } from "../../../modules/auth/constants/permissions";
import { container } from "../../../container";

const router = Router();

router.get(
  "/:employeeId/overview",
  auth,
  createLoadUserMiddleware(container.services.auth),
  authorize(PERMISSIONS.EMPLOYEE_READ),
  (req, res) => {
    res.json({
      message: "Employee overview route reached",
      employeeId: req.params.employeeId,
    });
  }
);

export default router;