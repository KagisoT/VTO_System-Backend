import { AppError } from "../../shared/errors";
import { devLogger } from "../../utils/dev-logger";

import {
    DebtRepository,
    ClientRepository
} from "../../repositories";

import {
    Debt,
    DebtStatus,
    CreateDebtRequest,
    UpdateDebtStatusRequest,
    AssignDebtRequest,
    UpdateDebtBalanceRequest,
    UpdateDebtNotesRequest
} from "./debt.types";

 

export class DebtService {

    constructor(

        private readonly repository: DebtRepository,

        private readonly clientRepository: ClientRepository

    ) {}

    /**
     * Create a debt.
     */
    async create(
        payload: CreateDebtRequest
    ): Promise<Debt> {

        // Resolve client_id from provided business id_number (create if missing)
        let client = await this.clientRepository.findByIdNumber(payload.id_number);
        if (!client) {
            client = await this.clientRepository.createClient(payload.id_number);
        }

        const existing =
            await this.repository.findByJbReference(
                payload.jb_internal_ref
            );

        if (existing) {

            throw new AppError(
                409,
                "Debt reference already exists."
            );

        }

        payload.calculated_debt =
            payload.principal +
            payload.initiation_fee +
            (payload.service_fee ?? 0) +
            payload.vat_if +
            payload.vat_sf +
            payload.interest;

        return this.repository.createDebt(payload, client!.id);

    }

    /**
     * Find by id.
     */
    async findById(
        debtId: string
    ): Promise<Debt> {

        const debt =
            await this.repository.findById(
                debtId
            );

        if (!debt) {

            throw new AppError(
                404,
                "Debt not found."
            );

        }

        return debt;

    }

    async findAssigned(
    employeeId: string
        ): Promise<Debt[]> {

    return this.repository.findByAssignedAgent(
        employeeId
        );
}

    /**
     * List all debts.
     */
    async findAll(): Promise<Debt[]> {

        devLogger.debug("debt.service.findAll: start");

        const debts = await this.repository.findAll();

        devLogger.debug("debt.service.findAll: completed", {
            debtCount: debts.length
        });

        return debts;

    }

    /**
     * Update debt.
     */
async updateStatus(
    debtId: string,
    payload: UpdateDebtStatusRequest
): Promise<Debt> {

    const debt =
        await this.repository.updateStatus(
            debtId,
            payload.status
        );

    if (!debt) {

        throw new AppError(
            404,
            "Debt not found."
        );

    }

    return debt;

}

async assignDebt(
    debtId: string,
    payload: AssignDebtRequest
): Promise<Debt> {

    const debt =
        await this.repository.assignDebt(
            debtId,
            payload.assigned_agent_id
        );

    if (!debt) {

        throw new AppError(
            404,
            "Debt not found."
        );

    }

    return debt;

}

async updateBalance(
    debtId: string,
    payload: UpdateDebtBalanceRequest
): Promise<Debt> {

    const debt =
        await this.repository.updateBalance(
            debtId,
            payload
        );

    if (!debt) {

        throw new AppError(
            404,
            "Debt not found."
        );

    }

    return debt;

}

async updateNotes(
    debtId: string,
    payload: UpdateDebtNotesRequest
): Promise<Debt> {

    const debt =
        await this.repository.updateNotes(
            debtId,
            payload.notes
        );

    if (!debt) {

        throw new AppError(
            404,
            "Debt not found."
        );

    }

    return debt;

}

    

    /**
     * Delete debt.
     */
    async delete(
        debtId: string
    ): Promise<void> {

        const deleted =
            await this.repository.deleteDebt(
                debtId
            );

        if (!deleted) {

            throw new AppError(
                404,
                "Debt not found."
            );

        }

    }

}