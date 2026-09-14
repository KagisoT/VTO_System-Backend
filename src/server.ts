import http from "http";

import app from "./app";

import { env } from "./config/env";
import { database } from "./config/database";
import { logger } from "./config/logger";


let shuttingDown = false;

async function bootstrap(): Promise<void> {

    try {

        logger.info("Starting Debt Collection API...");

        /**
         * Verify PostgreSQL connection
         */
        await database.query("SELECT NOW()");

        logger.info("✓ PostgreSQL connected.");


        /**
         * Create HTTP server
         */
        const server = http.createServer(app);

        /**
         * Server errors
         */
        server.on("error", (error: NodeJS.ErrnoException) => {

            switch (error.code) {

                case "EADDRINUSE":

                    logger.error(
                        `Port ${env.PORT} is already in use.`
                    );

                    break;

                case "EACCES":

                    logger.error(
                        `Permission denied for port ${env.PORT}.`
                    );

                    break;

                default:

                    logger.error(error);

            }

            process.exit(1);

        });

        /**
         * Start server
         */
        server.listen(env.PORT, () => {

            logger.info("====================================");

            logger.info("Debt Collection API");

            logger.info(`Environment : ${env.NODE_ENV}`);

            logger.info(`Port        : ${env.PORT}`);

            logger.info("====================================");

        });

        /**
         * Graceful shutdown
         */
        async function shutdown(signal: string): Promise<void> {

            if (shuttingDown) {

                return;

            }

            shuttingDown = true;

            logger.warn(`${signal} received. Shutting down...`);

            server.close(async () => {

                try {

                    await database.end();

                    logger.info("✓ PostgreSQL disconnected.");

                }

                catch (error) {

                    logger.error(error);

                }

                logger.info("Server stopped.");

                process.exit(0);

            });

        }

        process.on("SIGINT", () => {

            void shutdown("SIGINT");

        });

        process.on("SIGTERM", () => {

            void shutdown("SIGTERM");

        });

        process.on("uncaughtException", async (error) => {

            logger.error("Uncaught Exception");

            logger.error(error);

            try {

                await database.end();

            }

            finally {

                process.exit(1);

            }

        });

        process.on("unhandledRejection", async (reason) => {

            logger.error("Unhandled Promise Rejection");

            logger.error(reason);

            try {

                await database.end();

            }

            finally {

                process.exit(1);

            }

        });

    }

    catch (error) {

        logger.error("Application failed to start.");

        logger.error(error);

        try {

            await database.end();

        }

        finally {

            process.exit(1);

        }

    }

}

void bootstrap();