
import {
    EmployeeRepository,
    CreateEmployeePayload,
    Employee,
    EmployeeOverview
} from "../../repositories/employee.repository";


export class EmployeeService {

    constructor(
        private readonly repository: EmployeeRepository,
    ) {}


    /**
     * Create an employee.
     */
    async createEmployee(
        payload: CreateEmployeePayload
    ): Promise<Employee> {

        return this.repository.createEmployee(
            payload
        );
    }


    /**
     * Get all employees.
     */
    async getEmployees(): Promise<Employee[]> {

        return this.repository.getEmployees();
    }


    /**
     * Get employee overview.
     *
     * Worked accounts are determined from the account's
     * date_worked value in PostgreSQL.
     */
    async getOverview(
        employeeId: string
    ): Promise<EmployeeOverview> {

        return this.repository.getOverview(
            employeeId
        );
    }

}

