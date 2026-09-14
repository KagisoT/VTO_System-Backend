export const ROLE_PERMISSIONS: Record<number, string[]> = {
    // Collector role (id = 1) — subset of permissions
    1: [
        'client.read',
        'debt.read.assigned',
        'debt.update',
        'payment.read',
        'payment.create',
        'arrangement.read',
        'arrangement.create',
        'arrangement.update',
        'activity.read',
        'activity.create',
        'call.read',
        'call.create',
        'document.read',
        'document.upload'
    ],

    // Admin role (id = 4001) — all permissions (explicit list copied from DB seed)
    4001: [
        'employee.read',
        'employee.create',
        'employee.update',
        'employee.deactivate',
        'client.read',
        'client.create',
        'client.update',
        'debt.read.all',
        'debt.read.assigned',
        'debt.create',
        'debt.update',
        'debt.assign',
        'payment.read',
        'payment.create',
        'payment.update',
        'arrangement.read',
        'arrangement.create',
        'arrangement.update',
        'activity.read',
        'activity.create',
        'call.read',
        'call.create',
        'document.read',
        'document.upload',
        'import.create',
        'import.review',
        'audit.read'
    ]
};

export type RolePermissionsMap = typeof ROLE_PERMISSIONS;
