import { HealthRepository } from "../../repositories";

export class HealthService {

    constructor(
        private readonly repository: HealthRepository
    ) {}

    async checkHealth() {

        const connected =
            await this.repository.ping();

        return {

            status: connected ? "OK" : "ERROR",

            database: connected
                ? "Connected"
                : "Disconnected",

            connected

        };

    }

}
