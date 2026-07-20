import { BaseRepository } from "./base.repository";
import { CurrentUser } from "../modules/auth";

export class UserRepository extends BaseRepository {

   // async loadCurrentUser(authId: string) {}

       async loadCurrentUser(
        authId: string
    ): Promise<CurrentUser> {

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

    async findUserById(id: string) {}

    async findUserByAuthId(authId: string) {}

    async createUserProfile(
        authId: string,
        email: string
    ) {}

    async updateUserProfile(
        id: string,
        payload: unknown
    ) {}

}