import { env } from "../config/env";

export function getCurrentBusinessDate(): string {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: env.APP_TIMEZONE
        }
    ).format(new Date());
}