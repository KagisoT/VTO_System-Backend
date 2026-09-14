import { PermissionRepository } from "../../repositories";
import { ROLE_PERMISSIONS } from "./constants/role-permissions";

export class PermissionService {

    // Keep repository in constructor for DI compatibility, but we won't use it.
    constructor(
        private readonly repository: PermissionRepository
    ) {}

    async getPermissions(
        role_id: number
    ): Promise<string[]> {

        return ROLE_PERMISSIONS[role_id] ?? [];

    }

    async getPermissionsForRole(
        roleId: number
    ): Promise<string[]> {

        return ROLE_PERMISSIONS[roleId] ?? [];

    }

    async hasPermission(
        role_id: number,
        permission: string
    ): Promise<boolean> {

        const perms = ROLE_PERMISSIONS[role_id] ?? [];
        return perms.includes(permission);

    }

}