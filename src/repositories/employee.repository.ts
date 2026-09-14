import { database } from "../config/database";

export interface CreateEmployeePayload {
    employee_id: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    address: string;
    job_title: string;
    role_id?: number;
    is_active: boolean;
}

export interface Employee {
    employee_id: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    address: string;
    role_id: number | null;
    is_active: boolean;

}

    export interface EmployeeAssignedAccount {
    debt_id: string;
}


export interface EmployeeOverview {

    employee: Employee;

    statistics: {

        activeAccounts: number;

        accountsWorked: number;

        outgoingCalls: number;

        currentSessionStartedAt: Date | null;

    };

    assignedAccounts: EmployeeAssignedAccount[];

}


export class EmployeeRepository {

    /**
     * Create a new employee.
     */
    async createEmployee(
        payload: CreateEmployeePayload
    ): Promise<Employee> {

        const query = `
            INSERT INTO employees (
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                address,
                job_title,
                role_id,
                is_active
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            )
            RETURNING
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                address,
                job_title,
                role_id,
                is_active
        `;

        const values = [
            payload.employee_id,
            payload.firstname,
            payload.lastname,
            payload.email,
            payload.phone,
            payload.address,
            payload.job_title,
            payload.role_id ?? 1,
            payload.is_active
        ];

        const result = await database.query(
            query,
            values
        );

        return result.rows[0];
    }

    /**
     * Get all employees.
     */
    async getEmployees(): Promise<Employee[]> {

        const query = `
            SELECT
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                address,
                job_title,
                is_active
            FROM employees
            ORDER BY employee_id ASC
        `;

        const result = await database.query(
            query
        );

        return result.rows;
    }

    /**
 * Get employee overview.
 */
async getOverview(
    employeeId: string
): Promise<EmployeeOverview> {

    const query = `
        SELECT
            employee_id,
            first_name,
            last_name,
            email,
            phone,
            address,
            job_title,
            is_active
        FROM employees
        WHERE employee_id = $1
    `;

    const result = await database.query(
        query,
        [employeeId]
    );

    return {
        employee: result.rows[0],
        statistics: {
            activeAccounts: 0,
            accountsWorked: 0,
            outgoingCalls: 0,
            currentSessionStartedAt: null
        },
        assignedAccounts: []
    };
}
}