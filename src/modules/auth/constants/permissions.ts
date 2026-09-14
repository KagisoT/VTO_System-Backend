import { AUTH_PERMISSIONS } from './auth-permissions';

export const PERMISSIONS = {
  // system / admin
  ROLES_CREATE: AUTH_PERMISSIONS.ROLES_CREATE,

  // employees
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DEACTIVATE: 'employee.deactivate',

  // clients
  CLIENT_READ: 'client.read',
  CLIENT_CREATE: 'client.create',
  CLIENT_UPDATE: 'client.update',

  // debts
  DEBT_READ_ALL: 'debt.read.all',
  DEBT_READ_ASSIGNED: 'debt.read.assigned',
  DEBT_CREATE: 'debt.create',
  DEBT_UPDATE: 'debt.update',
  DEBT_ASSIGN: 'debt.assign',
  DEBT_VIEW: 'debt.view',
  DEBT_UPDATE_STATUS: 'debt.update.status',
  DEBT_UPDATE_BALANCE: 'debt.update.balance',
  DEBT_UPDATE_NOTES: 'debt.update.notes',
  DEBT_DELETE: 'debt.delete',

  // payments
  PAYMENT_READ: 'payment.read',
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_UPDATE: 'payment.update',

  // arrangements
  ARRANGEMENT_READ: 'arrangement.read',
  ARRANGEMENT_CREATE: 'arrangement.create',
  ARRANGEMENT_UPDATE: 'arrangement.update',

  // activities / calls
  ACTIVITY_READ: 'activity.read',
  ACTIVITY_CREATE: 'activity.create',
  CALL_READ: 'call.read',
  CALL_CREATE: 'call.create',

  // documents
  DOCUMENT_READ: 'document.read',
  DOCUMENT_UPLOAD: 'document.upload',

  // imports / audit
  IMPORT_CREATE: 'import.create',
  IMPORT_REVIEW: 'import.review',
  AUDIT_READ: 'audit.read'
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export default PERMISSIONS;
