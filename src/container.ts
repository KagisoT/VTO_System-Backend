/*import {

    PermissionRepository,
    AuthRepository,
    HealthRepository,
    EmployeeRepository,
    ClientRepository,
    DebtRepository,
    PaymentRepository,
    AuditRepository,
    NotificationRepository
} from "./repositories";

*/

import { UserRepository } from "./repositories/user.repository";
import { PermissionRepository } from "./repositories/permission.repository";
import { AuthRepository } from "./repositories/auth.repository";
import { HealthRepository } from "./repositories/health.repository";
import { EmployeeRepository } from "./repositories/employee.repository";
import { ClientRepository } from "./repositories/client.repository";
import { DebtRepository } from "./repositories/debt.repository";
import { PaymentRepository } from "./repositories/payment.repository";
import { AuditRepository } from "./repositories/audit.repository";
import { NotificationRepository } from "./repositories/notification.repository";



import {
    AuthController,
    AuthService,
    UserService,
    PermissionService
} from "./modules/auth";

import {
    HealthController,
    HealthService
} from "./modules/health";

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

const userRepository = new UserRepository();

const permissionRepository = new PermissionRepository();

const authRepository = new AuthRepository();

const healthRepository = new HealthRepository();

const employeeRepository = new EmployeeRepository();

const clientRepository = new ClientRepository();

const debtRepository = new DebtRepository();

const paymentRepository = new PaymentRepository();

const auditRepository = new AuditRepository();

const notificationRepository = new NotificationRepository();

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

const userService =
    new UserService(userRepository);

const permissionService =
    new PermissionService(permissionRepository);

const authService =
    new AuthService(
        userService,
        permissionService
    );

const healthService =
    new HealthService(
        healthRepository
    );

/*
|--------------------------------------------------------------------------
| Controllers
|--------------------------------------------------------------------------
*/

const authController =
    new AuthController(authService);

const healthController =
    new HealthController(healthService);

/*
|--------------------------------------------------------------------------
| Container
|--------------------------------------------------------------------------
*/

export const container = Object.freeze({

    repositories: {

        auth: authRepository,

        user: userRepository,

        permission: permissionRepository,

        health: healthRepository,

        employee: employeeRepository,

        client: clientRepository,

        debt: debtRepository,

        payment: paymentRepository,

        audit: auditRepository,

        notification: notificationRepository

    },

    services: {

        auth: authService,

        user: userService,

        permission: permissionService,

        health: healthService

    },

    controllers: {

        auth: authController,

        health: healthController

    }

});

export type AppContainer = typeof container;