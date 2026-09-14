import { env } from "../config/env";

const enabled = env.NODE_ENV === "development";

export const devLogger = {
    debug: (message: string, meta?: unknown) => {
        if (!enabled) return;
        if (meta !== undefined) {
            console.debug("[DEV]", message, meta);
            return;
        }
        console.debug("[DEV]", message);
    },

    error: (message: string, error?: unknown) => {
        if (!enabled) return;
        if (error !== undefined) {
            console.error("[DEV]", message, error);
            return;
        }
        console.error("[DEV]", message);
    }
};
