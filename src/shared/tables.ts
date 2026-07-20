export const Tables = {

    USERS: "User",

    AGENCIES: "agencies",

    AGENTS: "agents",

    DEBTORS: "debtors",

    COLLECTION_ACTIONS: "collection_actions",

    DEBTS: "debts",

    PAYMENTS: "payments",

    NOTES: "notes",

    TASKS: "tasks",

    DOCUMENTS: "documents",

    ROLES: "roles",

    PERMISSIONS: "permissions",

    ROLE_PERMISSIONS: "role_permissions",

    USER_ROLES: "user_roles",

    AUDIT_LOGS: "audit_logs"

} as const;

export type TableName = typeof Tables[keyof typeof Tables];