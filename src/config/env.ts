import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
    NODE_ENV: z.enum([
        "development",
        "production",
        "test"
    ]).default("development"),

    PORT: z.coerce.number().default(3002),

    DATABASE_URL: z.string().min(1),

    SUPABASE_URL: z.string().url(),

    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    JWT_SECRET: z.string().min(32),

    REDIS_URL: z.string().url(),

    APP_TIMEZONE: z.string().default("Africa/Johannesburg")
});

const result = schema.safeParse(process.env);

if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.issues);
    process.exit(1);
}

export const env = Object.freeze(result.data);