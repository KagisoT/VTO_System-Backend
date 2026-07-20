export const Permissions = {

    EMPLOYEE_CREATE: "employee.create",
    EMPLOYEE_READ: "employee.read",
    EMPLOYEE_UPDATE: "employee.update",
    EMPLOYEE_DELETE: "employee.delete",

    CLIENT_CREATE: "client.create",
    CLIENT_READ: "client.read",
    CLIENT_UPDATE: "client.update",
    CLIENT_DELETE: "client.delete",

    ACCOUNT_CREATE: "account.create",
    ACCOUNT_READ: "account.read",
    ACCOUNT_UPDATE: "account.update",
    ACCOUNT_CLOSE: "account.close",

    COLLECTION_CREATE: "collection.create",
    COLLECTION_UPDATE: "collection.update",

    PAYMENT_CREATE: "payment.create",
    PAYMENT_APPROVE: "payment.approve",

    REPORT_VIEW: "report.view",

    SETTINGS_UPDATE: "settings.update"

} as const;