import {
    Pool,
    PoolClient,
    QueryResult,
    QueryResultRow
} from "pg";

import { database } from "../config/database";

export class DatabaseRepository {

    private readonly db: Pool;

    constructor() {
        this.db = database;
    }

    /**
     * Execute any SQL query.
     */
    async query<T extends QueryResultRow = any>(
        sql: string,
        params: any[] = []
    ): Promise<QueryResult<T>> {

        return this.db.query<T>(sql, params);

    }

    /**
     * Returns the first row or null.
     */
    async findOne<T extends QueryResultRow = any>(
        sql: string,
        params: any[] = []
    ): Promise<T | null> {

        const result = await this.query<T>(sql, params);

        return result.rows[0] ?? null;

    }

    /**
     * Returns all rows.
     */
    async findMany<T extends QueryResultRow = any>(
        sql: string,
        params: any[] = []
    ): Promise<T[]> {

        const result = await this.query<T>(sql, params);

        return result.rows;

    }

    /**
     * Execute INSERT/UPDATE/DELETE
     * and return affected row count.
     */
    async execute(
        sql: string,
        params: any[] = []
    ): Promise<number> {

        const result = await this.query(sql, params);

        return result.rowCount ?? 0;

    }

    /**
     * Returns true if at least one row exists.
     */
    async exists(
        sql: string,
        params: any[] = []
    ): Promise<boolean> {

        const result = await this.query(sql, params);

        return result.rows.length > 0;

    }

    /**
     * Returns COUNT(*)
     */
    async count(
        sql: string,
        params: any[] = []
    ): Promise<number> {

        const result = await this.query(sql, params);

        return Number(result.rows[0]?.count ?? 0);

    }

    /**
     * Transaction helper.
     */
    async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {

        const client = await this.db.connect();

        try {

            await client.query("BEGIN");

            const result = await callback(client);

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