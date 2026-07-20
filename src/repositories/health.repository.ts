import { BaseRepository } from "./base.repository";

export class HealthRepository extends BaseRepository {

    async ping(): Promise<boolean> {

        try {

            await this.query(
                "SELECT 1;"
            );

            return true;

        }

        catch {

            return false;

        }

    }

    async version() {

        return this.findOne<{
            version: string;
        }>(
            "SELECT version();"
        );

    }

    async databaseTime() {

        return this.findOne<{
            now: Date;
        }>(
            "SELECT NOW();"
        );

    }

}