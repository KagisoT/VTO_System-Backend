// src/server.ts

import app from "./app";

import { database } from "./config/database";



import { env } from "./config/env";
import { logger } from "./config/logger";

async function start(): Promise<void> {
    try {
        logger.info("Connecting to PostgreSQL...");

        // Verify the database connection
        const result = await database.query("SELECT NOW() AS current_time");

        logger.info(
            `✓ PostgreSQL connected (${result.rows[0].current_time})`
        );

        app.listen(env.PORT, () => {
            logger.info("======================================");
            logger.info("Debt Collection API Started");
            logger.info(`Environment : ${env.NODE_ENV}`);
            logger.info(`Port        : ${env.PORT}`);
            logger.info("======================================");
        });

    } catch (error) {

        logger.error("Failed to connect to PostgreSQL.");

        if (error instanceof Error) {
            logger.error(error.message);
            console.error(error.stack);
        } else {
            console.error(error);
        }

        process.exit(1);
    }
}

void start();