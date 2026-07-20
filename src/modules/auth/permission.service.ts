import { DatabaseRepository } from "../repositories/database.repository";

export class PermissionService {

    constructor(
        private readonly repository: DatabaseRepository
    ) {}

    async hasPermission(

        userId: string,

        permission: string

    ): Promise<boolean> {

        return true;

    }

}