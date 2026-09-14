import { UserRepository } from "../../repositories/user.repository";
import { devLogger } from "../../utils/dev-logger";
import { CurrentUser } from "./auth.types";
import { PermissionService } from "./permission.service";

export class UserService {

    constructor(
        private readonly repository: UserRepository,

        private readonly permissionService: PermissionService
    ) {}

    /**
     * Returns the application's user profile.
     */
    async loadCurrentUser(
    authId: string
): Promise<CurrentUser> {

    devLogger.debug(
        "userService.loadCurrentUser: START",
        { authId }
    );

    const user =
        await this.repository.loadCurrentUser(authId);

    devLogger.debug(
        "userService.loadCurrentUser: USER LOADED",
        {
            authId: user.authId,
            roleId: user.roleId,
            roleName: user.roleName
        }
    );

    devLogger.debug(
        "userService.loadCurrentUser: BEFORE PERMISSIONS",
        {
            roleId: user.roleId
        }
    );

    const permissions =
        await this.permissionService.getPermissionsForRole(
            user.roleId
        );

    devLogger.debug(
        "userService.loadCurrentUser: PERMISSIONS LOADED",
        {
            roleId: user.roleId,
            permissionsLength: permissions.length
        }
    );

    return {
        ...user,
        permissions
    };
}


    /**
     * Generate the next employee ID.
     *
     * EMP001
     * EMP002
     * EMP003
     */
async generateEmployeeId(): Promise<string> {

    const result =
        await this.repository.getNextEmployeeNumber();

    return `EMP${String(result).padStart(3, "0")}`;
}
    /**
     * Creates the application's user profile.
     */
    async createProfile(

    authId: string,
    employeeId: string,
    email: string,
    roleId: number

) {

    return this.repository.createUserProfile(

        authId,
        employeeId,
        email,
        roleId

    );

}


    async findByAuthId(
        authId: string
    ) {

        return this.repository.findUserByAuthId(
            authId
        );

    }

    async findById(
        id: string
    ) {

        return this.repository.findUserByAuthId(
            id
        );

    }
    async updateProfile(

    authId: string,

    payload: {

        email?: string;
        employee_id?: string | null;
        role_id?: number;
        is_active?: boolean;

    }

) {

    return this.repository.updateUserProfile(

        authId,
        payload

    );

}

}