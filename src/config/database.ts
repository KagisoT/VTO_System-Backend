import { Pool } from "pg";
import { env } from "./env";
import { devLogger } from "../utils/dev-logger";


export const database = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

database.on("connect", () => {
    devLogger.debug("database: connected to PostgreSQL");
});

database.on("error", (error) => {
    devLogger.error("database: PostgreSQL error", error);
    process.exit(1);
});