import { Pool } from "pg";
import { env } from "./env";


export const database = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

database.on("connect", () => {
    console.log("✅ PostgreSQL Connected");
});

database.on("error", (error) => {
    console.error("❌ PostgreSQL Error:", error);
    process.exit(1);
});