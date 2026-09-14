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
import { ImportRepository } from "./repositories/import.repository";

import { DebtController } from "./modules/debts/debt.contoller";
import { DebtService } from "./modules/debts/debt.service";
import { EmployeeController } from "./modules/employee/employee.controller";
import { ImportService } from "./modules/import/import.service";
import { ImportController } from "./modules/import/import.controller";

import {
    AuthController,
    AuthService,
    UserService,
    PermissionService,
    createLoadUserMiddleware
} from "./modules/auth";

import {
    HealthController,
    HealthService
} from "./modules/health";

import { EmployeeService } from "./modules/employee/employee.service";


/*
 * --------------------------------------------------------------------------
 * Repositories
 * --------------------------------------------------------------------------
 */



const userRepository =
    new UserRepository();

const permissionRepository =
    new PermissionRepository();

const authRepository =
    new AuthRepository();

const healthRepository =
    new HealthRepository();

const employeeRepository =
    new EmployeeRepository();

const clientRepository =
    new ClientRepository();

const debtRepository =
    new DebtRepository();

const paymentRepository =
    new PaymentRepository();

const auditRepository =
    new AuditRepository();

const notificationRepository =
    new NotificationRepository();

    
const importRepository =
    new ImportRepository();


/*
 * --------------------------------------------------------------------------
 * Services
 * --------------------------------------------------------------------------
 */

const permissionService =
    new PermissionService(
        permissionRepository
    );

const userService =
    new UserService(
        userRepository,
        permissionService
    );

const employeeService =
    new EmployeeService(
        employeeRepository

    );

const debtService =
    new DebtService(
        debtRepository,
        clientRepository
    );

const authService =
    new AuthService(
        userService,
        permissionService,
        employeeService
    );

const healthService =
    new HealthService(
        healthRepository
    );

export const importService =
    new ImportService(
        importRepository
    );



/*
 * --------------------------------------------------------------------------
 * Middleware
 * --------------------------------------------------------------------------
 */

export const loadUser =
    createLoadUserMiddleware(
        authService
    );


/*
 * --------------------------------------------------------------------------
 * Controllers
 * --------------------------------------------------------------------------
 */

const debtController =
    new DebtController(
        debtService
    );

const authController =
    new AuthController(
        authService
    );

const healthController =
    new HealthController(
        healthService
    );

const employeeController =
    new EmployeeController(
        employeeService);

export const importController =
    new ImportController(
        importService
    );

/*
 * --------------------------------------------------------------------------
 * Container
 * --------------------------------------------------------------------------
 */


export const container =
    Object.freeze({

        repositories: {

            auth:
                authRepository,

            user:
                userRepository,

            permission:
                permissionRepository,

            health:
                healthRepository,

            employee:
                employeeRepository,

            client:
                clientRepository,

            debt:
                debtRepository,

            payment:
                paymentRepository,

            audit:
                auditRepository,

            notification:
                notificationRepository,

            import:
                importRepository

        },

        services: {

            debt:
                debtService,

            auth:
                authService,

            user:
                userService,

            permission:
                permissionService,

            health:
                healthService,

            employee:
                employeeService,

            import:
                importService

        },

        controllers: {

            debt:
                debtController,

            auth:
                authController,

            health:
                healthController,

            employee:
                employeeController,

            import:
                importController

        }

    });



export type AppContainer =
    typeof container;