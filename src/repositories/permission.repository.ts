import { BaseRepository } from "./base.repository";
import { devLogger } from "../utils/dev-logger";

export class PermissionRepository extends BaseRepository {

        async findPermissionsByRole(
        role_id: number
    ): Promise<string[]> {

        devLogger.debug("permission.repository: role id", { role_id });

        const permissions =

        
            await this.findMany<{
                permission_name: string;
            }>(

                `
                SELECT

                    p.permission_name

                FROM role_permissions rp

                INNER JOIN permissions p

                    ON p.permission_id = rp.permission_id

                WHERE rp.role_id = $1
                `,

                [role_id]

            );

            devLogger.debug("permission.repository: raw permissions", {
                permissions
            });
            
        return permissions.map(

            permission =>
                permission.permission_name

        );

    }



    async getPermissions(
        role_id: number
    ): Promise<string[]> {

        return [];

    }

    async hasPermission(
        role_id: number,
        permission: string
    ): Promise<boolean> {

        return false;

    }

    async assignRole(
        userId: string,
        role_id: number
    ): Promise<void> {

        return;

    }

    async removeRole(
        userId: string
    ): Promise<void> {

        return;

    }

}