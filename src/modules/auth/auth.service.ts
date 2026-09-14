import { UserService } from "./user.service";
import { PermissionService } from "./permission.service";
import { supabaseAuth } from "../../config/supabase-auth";
import { devLogger } from "../../utils/dev-logger";
import { EmployeeService } from "../employee/employee.service";

import {
    LoginRequest,
    LoginResponse,
    CurrentUser,
    RegisterRequest,
    RegisterResponse
} from "./auth.types";
import { AUTH_PERMISSIONS } from "./constants/auth-permissions";

import { AppError } from "../../shared/errors";

export class AuthService {

    constructor(
        private readonly userService: UserService,
        private readonly permissionService: PermissionService,
        private readonly employeeService: EmployeeService
    ) {}


    /**
     * Authenticate a user with Supabase Auth,
     * then load the employee, role and permissions
     * from PostgreSQL.
     */
    async login(
        credentials: LoginRequest
    ): Promise<LoginResponse> {

        const { data, error } =
            await supabaseAuth.auth.signInWithPassword({

                email: credentials.email,

                password: credentials.password

            });


        if (error) {

            throw new AppError(
                401,
                error.message
            );

        }


        if (!data.user || !data.session) {

            throw new AppError(
                401,
                "Authentication failed."
            );

        }


        /*
         * Check whether the application
         * already knows this user.
         */
        const user =
            await this.userService.findByAuthId(
                data.user.id
            );


        /*
         * First login after registration.
         *
         * This is where JIT provisioning happens.
         */
        if (!user) {

            const firstName =
                data.user.user_metadata?.name ?? "";

            const surname =
                data.user.user_metadata?.surname ?? "";



            const roleId =
                Number(
                    data.user.user_metadata?.roleId ?? 1
                );

            const employeeId =
                data.user.user_metadata?.employeeId ?? "";


            if (!employeeId) {

                throw new AppError(
                    500,
                    "Employee ID is missing from authentication metadata."
                );

            }


            devLogger.debug(
                "auth.service: creating user profile",
                {
                    authId: data.user.id,
                    email: data.user.email,
                    roleId,
                    employeeId
                }
            );


            /*
             * The employee record should already exist
             * because it was created during registration.
             *
             * JIT provisioning now creates the
             * application users record.
             */
            await this.userService.createProfile(

                data.user.id,

                employeeId,

                data.user.email ?? "",

                roleId

            );


            /*
             * Load the newly-created application
             * user including permissions.
             */
            const currentUser =
                await this.userService.loadCurrentUser(
                    data.user.id
                );


            devLogger.debug(
                "auth.service: JIT provisioning completed",
                {
                    authId: data.user.id,
                    employeeId,
                    roleId
                }
            );


            return {

                accessToken:
                    data.session.access_token,

                refreshToken:
                    data.session.refresh_token,

                expiresAt:
                    data.session.expires_at,

                user:
                    currentUser

            };

        }


        /*
         * Existing user.
         *
         * Reload the complete application profile
         * including role and permissions.
         */
        devLogger.debug(
            "auth.service: loading current user",
            {
                authId: data.user.id,
                existingUser: user
            }
        );


        const currentUser =
            await this.userService.loadCurrentUser(
                data.user.id
            );


        devLogger.debug(
            "auth.service: login success",
            {
                authId: data.user.id,
                employeeId: currentUser.employeeId,
                roleId: currentUser.roleId
            }
        );


        return {

            accessToken:
                data.session.access_token,

            refreshToken:
                data.session.refresh_token,

            expiresAt:
                data.session.expires_at,

            user:
                currentUser

        };

    }


    /**
     * Returns the currently authenticated user.
     */
    async me(
        authId: string
    ): Promise<CurrentUser> {

        return this.userService.loadCurrentUser(
            authId
        );

    }


    /**
     * Sends password reset email.
     */
    async forgotPassword(
        email: string
    ): Promise<void> {

        const { error } =
            await supabaseAuth.auth.resetPasswordForEmail(
                email
            );


        if (error) {

            throw new AppError(
                400,
                error.message
            );

        }

    }


    /**
     * Placeholder for logout.
     *
     * JWT logout is handled client-side.
     */
    async logout(): Promise<void> {

        return;

    }


    /**
     * Register a new employee.
     *
     * The Admin frontend supplies:
     *
     * email
     * password
     * name
     * surname
     * phone
     * address
     * jobTitle
     *
     * The backend generates:
     *
     * employeeId
     * roleId
     */
    async register(
        payload: RegisterRequest,
        creator?: Express.CurrentUser
    ): Promise<RegisterResponse> {

        devLogger.debug(
            "auth.service: register payload",
            {
                email: payload.email,
                passwordLength:
                    payload.password.length,
                name:
                    payload.name,
                surname:
                    payload.surname,
                phone:
                    payload.phone,
                address:
                    payload.address,
                role_id:
                    payload.roleId
            }
        );


        /*
         * The backend owns employee ID generation.
         */
        const employeeId =
            await this.userService.generateEmployeeId();


        devLogger.debug(
            "auth.service: generated employee ID",
            {
                employeeId
            }
        );


        /*
         * The employee table MUST be populated
         * before the user can be JIT provisioned.
         *
         * users.employee_id has a foreign key
         * to employee.employee_id.
         */
        await this.employeeService.createEmployee({

            employee_id:
                employeeId,

            firstname:
                payload.name,

            lastname:
                payload.surname,

            email:
                payload.email,

            phone:
                payload.phone,

            address:
                payload.address,

            job_title:
                payload.jobTitle,

            role_id:
                payload.roleId,

            is_active:
                true

        });


        /*
         * Role is controlled by the backend.
         *
         * Collector role = 1.
         *
         * Do NOT accept roleId from the frontend.
         */
       // const roleId = 1;


        /*
         * Create the Supabase Auth account.
         *
         * The employee ID is stored in metadata
         * so that JIT provisioning can retrieve it
         * during the employee's first login.
         */
        // Default role is Collector
        const defaultRoleId = 1;

        // Determine role to assign: only allow payload.roleId when the
        // creator is present and has the ROLES_CREATE permission.
        let roleId = defaultRoleId;

        if (payload.roleId !== undefined) {
            if (creator && creator.permissions.includes(AUTH_PERMISSIONS.ROLES_CREATE)) {
                roleId = payload.roleId;
            } else {
                devLogger.debug("auth.service: roleId ignored from payload; creator not authorised", {
                    attemptedRoleId: payload.roleId
                });
            }
        }

        const { data, error } =
            await supabaseAuth.auth.signUp({

                email: payload.email,

                password: payload.password,

                options: {

                    data: {

                        name: payload.name,

                        surname: payload.surname,

                        roleId: roleId,

                        employeeId: employeeId

                    }

                }

            });


        /*
         * If Supabase registration fails,
         * do not report a successful registration.
         */
        if (error) {

            throw new AppError(
                400,
                error.message
            );

        }


        if (!data.user) {

            throw new AppError(
                500,
                "Unable to create user."
            );

        }


        devLogger.debug(
            "auth.service: registration successful",
            {
                authId:
                    data.user.id,

                email:
                    data.user.email,

                employeeId:
                    employeeId,

                roleId:
                    roleId
            }
        );


        return {

            id:
                data.user.id,

            email:
                data.user.email ?? "",

            name:
                payload.name,

            surname:
                payload.surname,

            employeeId:
                employeeId

        };

    }

}