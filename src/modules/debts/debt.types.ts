export type DebtStatus =
    | "ACTIVE"
    | "PAID"
    | "CLOSED"
    | "WRITTEN_OFF";

export interface Debt {

    assigned_agent_id: string | null;

    debt_id: string;

    id_number: string;

    loan_id: string;

    contract_number: string;

    jabulani_account_no: string;

    jb_internal_ref: string;

    principal: number;

    initiation_fee: number;

    service_fee: number;

    vat_if: number;

    vat_sf: number;

    interest: number;

    calculated_debt: number;

    days_overdue: number;

    target_date: Date;

    date_of_default: Date;

    assigned_agency: string;

    status: DebtStatus;

    notes: string;

    createdAt: Date;

    updatedAt: Date;

}

export interface CreateDebtRequest {

    assigned_agent_id: string | null;

    id_number: string;

    loan_id: string;

    contract_number: string;

    jabulani_account_no: string;

    jb_internal_ref: string;

    principal: number;

    initiation_fee: number;

    service_fee: number;

    vat_if: number;

    vat_sf: number;

    interest: number;

    calculated_debt: number;

    days_overdue: number;

    target_date: Date;

    date_of_default: Date;

    assigned_agency: string;

    status: DebtStatus;

    notes: string;

  
}

export interface UpdateDebtStatusRequest {

    status: DebtStatus;

}

export interface AssignDebtRequest {

    assigned_agent_id: string;

}

export interface UpdateDebtBalanceRequest {

    principal?: number;

    initiation_fee?: number;

    vat_if?: number;

    vat_sf?: number;

    interest?: number;

    days_overdue?: number;

    target_date?: Date;

    date_of_default?: Date;

    calculated_debt?: number;

}

export interface UpdateDebtNotesRequest {

    notes: string;

}

export interface DebtResponse {

    debt: Debt;

}