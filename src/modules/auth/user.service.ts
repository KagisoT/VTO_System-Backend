import { DatabaseRepository } from "../../repositories/database.repository";

export class UserService {

    constructor(
        private readonly repository: DatabaseRepository
    ) {}

    async loadCurrentUser(authId: string) {

        return {
            id: "",
            authId,
            employeeId: "",
            email: "",
            roleId: "",
            roleName: "",
            permissions: [],
            isActive: true
        };

    }

}