import {
    Pool,
    PoolClient,
    QueryResult,
    QueryResultRow
} from "pg";

import { database } from "../config/database";

export abstract class BaseRepository {

    protected readonly db: Pool;

    constructor() {

        this.db = database;

    }

    protected async query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params: unknown[] = []
    ): Promise<QueryResult<T>> {

        return this.db.query<T>(sql, params);

    }

    protected async findOne<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params: unknown[] = []
    ): Promise<T | null> {

        const result =
            await this.query<T>(sql, params);

        return result.rows[0] ?? null;

    }

    protected async findMany<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params: unknown[] = []
    ): Promise<T[]> {

        const result =
            await this.query<T>(sql, params);

        return result.rows;

    }

    protected async execute(
        sql: string,
        params: unknown[] = []
    ): Promise<number> {

        const result =
            await this.query(sql, params);

        return result.rowCount ?? 0;

    }

    protected async exists(
        sql: string,
        params: unknown[] = []
    ): Promise<boolean> {

        const result =
            await this.query(sql, params);

        return result.rows.length > 0;

    }

    protected async count(
        sql: string,
        params: unknown[] = []
    ): Promise<number> {

        const result =
            await this.query(sql, params);

        return Number(
            (result.rows[0] as any)?.count ?? 0
        );

    }

    protected async transaction<T>(
        callback: (
            client: PoolClient
        ) => Promise<T>
    ): Promise<T> {

        const client =
            await this.db.connect();

        try {

            await client.query("BEGIN");

            const result =
                await callback(client);

            await client.query("COMMIT");

            return result;

        }

        catch (error) {

            await client.query("ROLLBACK");

            throw error;

        }

        finally {

            client.release();

        }

    }

}