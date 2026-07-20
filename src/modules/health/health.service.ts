import { DatabaseRepository } from "../../repositories/database.repository";
import { Tables } from "../../../src/shared/tables";

export class HealthService {

    constructor(
        private readonly repository: DatabaseRepository
    ) {}

    async checkHealth() {

        const connected =
            await this.repository.exists(
                Tables.USERS
            
            );

        return {

            status: "OK",

            database: "Connected",

            connected

        };

    }

}
