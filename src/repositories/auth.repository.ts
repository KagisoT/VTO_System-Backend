import { BaseRepository } from "./base.repository";

export class AuthRepository extends BaseRepository {

    async recordLogin() {}

    async recordLogout() {}

    async storeRefreshToken() {}

    async revokeRefreshToken() {}

    async revokeAllRefreshTokens() {}

}