export const AUTH_ROLES = {

    SYSTEM_ADMIN: "System Administrator",

    ADMIN: "Administrator",

    MANAGER: "Manager",

    TEAM_LEADER: "Team Leader",

    AGENT: "Agent",

    VIEWER: "Viewer"

} as const;

export type AuthRole =
    typeof AUTH_ROLES[keyof typeof AUTH_ROLES];