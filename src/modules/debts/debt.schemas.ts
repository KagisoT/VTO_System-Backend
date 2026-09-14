import { z } from "zod";
import { DebtStatus } from "./debt.types";


const DebtStatuses = [
    "ACTIVE",
    "PAID",
    "CLOSED",
    "WRITTEN_OFF"
] as const;

export const createDebtSchema = z.object({

    body: z.object({

        // business identifiers (EMP001 style) are not UUIDs
        assigned_agent_id: z.string().min(1),

        // preserve imported id_number as free text (may include leading zeros)
        id_number: z.string().min(1),

        loan_id: z.string(),

        contract_number: z.string(),

        jabulani_account_no: z.string().min(1).max(100),

        jb_internal_ref: z.string().min(1).max(100),

        principal: z.number().nonnegative(),

        initiation_fee: z.number().nonnegative(),

        service_fee: z.number().nonnegative(),

        vat_if: z.number().nonnegative(),

        vat_sf: z.number().nonnegative(),

        interest: z.number().nonnegative(),

        calculated_debt: z.number().nonnegative(),

        days_overdue: z.number().int().nonnegative(),

        target_date: z.coerce.date(),

        date_of_default: z.coerce.date(),

        assigned_agency: z.string(),

        status: z.enum(DebtStatuses),

        notes: z.string().max(1000).optional()

    })

});

export interface UpdateDebtRequest {

    principal?: number;

    initiation_fee?: number;

    vat_if?: number;

    vat_sf?: number;

    interest?: number;

    days_overdue?: number;

    target_date?: Date;

    date_of_default?: Date;

    assigned_agency?: string;

    status?: DebtStatus;

    notes?: string | null;

}



export const updateDebtStatusSchema = z.object({

    body: z.object({

        status: z.enum([
            "ACTIVE",
            "CLOSED",
            "WRITTEN_OFF"
        ])

    })

});

export const assignDebtSchema = z.object({

    body: z.object({

        assigned_agent_id: z
            .string()
            .min(1)

    })

});

export const updateDebtBalanceSchema = z.object({

    body: z.object({

        principal: z.number().positive().optional(),

        initiation_fee: z.number().nonnegative().optional(),
        service_fee: z.number().nonnegative().optional(),

        vat_if: z.number().nonnegative().optional(),

        vat_sf: z.number().nonnegative().optional(),

        interest: z.number().nonnegative().optional(),

        days_overdue: z.number().int().nonnegative().optional(),

        target_date: z.coerce.date().optional(),

        date_of_default: z.coerce.date().optional()

    })

});

export const updateDebtNotesSchema = z.object({

    body: z.object({

        notes: z
            .string()
            .max(1000)

    })

});

export const debtIdSchema = z.object({

    params: z.object({

        id: z.string().uuid()

    })

});