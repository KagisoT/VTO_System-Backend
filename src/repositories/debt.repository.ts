import { BaseRepository } from "./base.repository";
import { DebtStatus } from "../modules/debts/debt.types"
import { devLogger } from "../utils/dev-logger";




import {
    Debt,
    CreateDebtRequest,
    UpdateDebtBalanceRequest
} from "../modules/debts/debt.index";

export class DebtRepository extends BaseRepository {

    /**
     * Create debt
     */
    async createDebt(
        payload: CreateDebtRequest,
        clientId?: string
    ): Promise<Debt> {

        const sql = `
            INSERT INTO "debts"
            (
                assigned_agent_id,
                client_id,
                id_number,
                loan_id,
                contract_number,
                jabulani_account_no,
                jb_internal_ref,
                principal,
                initiation_fee,
                service_fee,
                vat_if,
                vat_sf,
                interest,
                calculated_debt,
                days_overdue,
                target_date,
                date_of_default,
                assigned_agency,
                status,
                notes
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,
                $7,$8,$9,$10,$11,$12,
                $13,$14,$15,$16,$17,$18,$19,$20
            )
            RETURNING *;
        `;

        const debt = await this.findOne<Debt>(
            sql,
            [
                payload.assigned_agent_id,
                clientId ?? null,
                payload.id_number,
                payload.loan_id,
                payload.contract_number,
                payload.jabulani_account_no,
                payload.jb_internal_ref,
                payload.principal,
                payload.initiation_fee,
                payload.service_fee ?? 0,
                payload.vat_if,
                payload.vat_sf,
                payload.interest,
                payload.calculated_debt,
                payload.days_overdue,
                payload.target_date,
                payload.date_of_default,
                payload.assigned_agency,
                payload.status,
                payload.notes ?? null
            ]
        );

        return debt!;
    }

    /**
     * Find by id
     */
    async findById(
        debtId: string
    ): Promise<Debt | null> {

        return this.findOne<Debt>(
            `
            SELECT *
            FROM "debts"
            WHERE debt_id = $1;
            `,
            [debtId]
        );

    }

    /**
     * Find by internal reference
     */
    async findByJbReference(
        reference: string
    ): Promise<Debt | null> {

        return this.findOne<Debt>(
            `
            SELECT *
            FROM "debts"
            WHERE jb_internal_ref = $1;
            `,
            [reference]
        );

    }

    /**
     * Find all debts for a debtor
     */
    async findByDebtor(
        debtorId: string
    ): Promise<Debt[]> {

        return this.findMany<Debt>(
            `
            SELECT *
            FROM "debts"
            WHERE id_number = $1
            ORDER BY created_at DESC;
            `,
            [debtorId]
        );

    }

    /**
     * List all debts
     */
    async findAll(): Promise<Debt[]> {

       // devLogger.debug("debt.repository.findAll: running query");

        const debts = await this.findMany<Debt>(
            `
            SELECT *
            FROM "debts"
            ORDER BY created_at DESC;
            `
        );

        devLogger.debug("debt.repository.findAll: query completed", {
            debtCount: debts.length
        });

        return debts;

    }

    /**
     * Update debt
     */
   
    async updateStatus(
    debtId: string,
    status: DebtStatus
): Promise<Debt | null> { 

    return this.findOne<Debt>(
        `
        UPDATE "debts"
        SET
            status = $2,
            updated_at = NOW()
        WHERE debt_id = $1
        RETURNING *;
        `,
        [
            debtId,
            status
        ]
    );
}

async assignDebt(
    debtId: string,
    assignedAgent: string
): Promise<Debt | null> {

     return this.findOne<Debt>(
        `
        UPDATE "debts"
        SET
                assigned_agent_id = $2,
            updated_at = NOW()
        WHERE debt_id = $1
        RETURNING *;
        `,
        [
            debtId,
            assignedAgent
        ]
    );

}

async findByAssignedAgent(
    employeeId: string
): Promise<Debt[]> {

    const debts = await this.findMany<Debt>(
        `
        SELECT *
        FROM "debts"
        WHERE assigned_agent_id = $1
        ORDER BY created_at DESC;
        `,
        [employeeId]
    );

    devLogger.debug(
        "debt.repository.findByAssignedAgent: query completed",
        {
            employeeId,
            debtCount: debts.length
        }
    );

    return debts;
}

async updateBalance(
    debtId: string,
    payload: UpdateDebtBalanceRequest
): Promise<Debt | null> {

        return this.findOne<Debt>(
        `
        UPDATE "debts"
        SET
            principal = COALESCE($2, principal),
            initiation_fee = COALESCE($3, initiation_fee),
            vat_if = COALESCE($4, vat_if),
            vat_sf = COALESCE($5, vat_sf),
            interest = COALESCE($6, interest),
            calculated_debt = COALESCE($7, calculated_debt),
            days_overdue = COALESCE($8, days_overdue),
            target_date = COALESCE($9, target_date),
            date_of_default = COALESCE($10, date_of_default),
            updated_at = NOW()
        WHERE debt_id = $1
        RETURNING *;
        `,
        [
            debtId,
            payload.principal,
            payload.initiation_fee,
            payload.vat_if,
            payload.vat_sf,
            payload.interest,
            payload.calculated_debt,
            payload.days_overdue,
            payload.target_date,
            payload.date_of_default
        ]
    );
}

async updateNotes(
    debtId: string,
    notes: string | null
): Promise<Debt | null> {

       return this.findOne<Debt>(
        `
        UPDATE "debts"
        SET
            notes = $2,
            updated_at = NOW()
        WHERE debt_id = $1
        RETURNING *;
        `,
        [
            debtId,
            notes
        ]
    );
}

    /**
     * Delete debt
     */
    async deleteDebt(
        debtId: string
    ): Promise<boolean> {

        const rows = await this.execute(
            `
            DELETE
            FROM "debts"
            WHERE debt_id = $1;
            `,
            [debtId]
        );

        return rows > 0;

    }

}