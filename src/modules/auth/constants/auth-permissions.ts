export const AUTH_PERMISSIONS = {

    SYSTEM_ADMIN: "*",

    USERS_READ: "users.read",
    USERS_CREATE: "users.create",
    USERS_UPDATE: "users.update",
    USERS_DELETE: "users.delete",

    ROLES_READ: "roles.read",
    ROLES_CREATE: "roles.create",
    ROLES_UPDATE: "roles.update",
    ROLES_DELETE: "roles.delete",

    PERMISSIONS_READ: "permissions.read",
    PERMISSIONS_ASSIGN: "permissions.assign"

} as const;

export type AuthPermission =
    typeof AUTH_PERMISSIONS[keyof typeof AUTH_PERMISSIONS];