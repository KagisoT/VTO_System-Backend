import { BaseRepository } from "./base.repository";
import { CurrentUser } from "../types/current-user";
import { AppError } from "../shared/errors";

export class UserRepository extends BaseRepository {

    async loadCurrentUser(
        authId: string
    ): Promise<CurrentUser> {

        const user = await this.findOne<{
            id: string;
            auth_id: string;
            employee_id: string | null;
            email: string;
            first_name: string | null;
            surname: string | null;
            role_id: number;
            role_name: string;
            is_active: boolean;
        }>(
            `
            SELECT
                u.id,
                u.auth_id,
                u.employee_id,
                u.email,
                COALESCE(e.first_name)  AS first_name,
                COALESCE( e.last_name)     AS surname,
                u.role_id,
                COALESCE(r.role_name)        AS role_name,
                u.is_active
            FROM users u
            LEFT JOIN employees e ON e.employee_id = u.employee_id
            LEFT JOIN roles r ON (r.role_id = u.role_id OR r.role_id = u.role_id)
            WHERE u.auth_id = $1
            `,
            [authId]
        );

        if (!user) {
            throw new AppError(404, "User profile not found.");
        }

        return {
            id: user.id,
            authId: user.auth_id,
            employeeId: user.employee_id ?? "",
            email: user.email,
            firstName: user.first_name ?? "",
            lastName: user.surname ?? "",
            fullName: `${user.first_name ?? ""} ${user.surname ?? ""}`.trim(),
            roleId: user.role_id,
            roleName: user.role_name,
            permissions: [],
            isActive: user.is_active
        };

    }

    async getNextEmployeeNumber(): Promise<number> {
        const result = await this.query(`SELECT nextval('employee_id_seq') AS number;`);
        return Number(result.rows[0].number);
    }

    /**
     * Generate the next employee ID from the employees table (EMP001)
     */
    async generateEmployeeId(): Promise<string> {
        const result = await this.findOne<{ next_number: number }>(
            `
            SELECT
                COALESCE(
                    MAX(
                        CAST(
                            SUBSTRING(employee_id FROM 4)
                            AS INTEGER
                        )
                    ),
                    0
                ) + 1 AS next_number
            FROM employees
            WHERE employee_id ~ '^EMP[0-9]+$';
            `
        );

        const nextNumber = result?.next_number ?? 1;
        return `EMP${String(nextNumber).padStart(3, "0")}`;
    }

    async findUserByAuthId(authId: string) {
        return this.findOne(`SELECT * FROM users WHERE auth_id = $1`, [authId]);
    }

    async createUserProfile(
        authId: string,
        employeeId: string,
        email: string,
        roleId: number
    ) {
        return this.query(
            `
            INSERT INTO users
            (
                id,
                auth_id,
                employee_id,
                email,
                role_id,
                is_active
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                true
            )
            RETURNING *;
            `,
            [authId, authId, employeeId, email, roleId]
        );
    }

    async updateUserProfile(
        authId: string,
        payload: {
            email?: string;
            employee_id?: string | null;
            role_id?: number;
            is_active?: boolean;
        }
    ) {
        const fields: string[] = [];
        const values: unknown[] = [];

        let index = 1;
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined) {
                fields.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }

        if (fields.length === 0) return null;

        values.push(authId);

        const result = await this.query(
            `
            UPDATE users
            SET ${fields.join(", ")}
            WHERE auth_id = $${index}
            RETURNING *;
            `,
            values
        );

        return result.rows[0] ?? null;
    }

}
