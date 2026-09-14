export type ImportSeverity =
    | "ERROR"
    | "WARNING"
    | "INFO";


export type ImportDecision =
    | "CREATE"
    | "UPDATE"
    | "REVIEW_REQUIRED"
    | "REJECTED";


export interface ImportIssue {
    field?: string;
    severity: ImportSeverity;
    code: string;
    message: string;
}


export interface ImportValidationRow {
    sourceRow: number;

    decision: ImportDecision;

    matchedClientId?: string | null;
    matchedDebtId?: string | null;

    matchedBy: string[];

    issues: ImportIssue[];

    normalized: Record<string, any>;

    raw: Record<string, any>;
}


export interface ImportValidationRequest {
    filename: string;
    source?: string;
    rows: Record<string, any>[];
}


export interface ImportValidationResult {
    filename: string;

    totalRows: number;

    createCount: number;
    updateCount: number;
    reviewCount: number;
    rejectedCount: number;

    validForCommit: boolean;

    rows: ImportValidationRow[];
}

export type ImportCommitRowStatus =
    | "IMPORTED"
    | "UPDATED"
    | "REVIEW_REQUIRED"
    | "REJECTED"
    | "FAILED";


export interface ImportCommitRowResult {
    sourceRow: number;
    status: ImportCommitRowStatus;

    matchedClientId: string | null | undefined;
    matchedDebtId: string | null;

    issues: ImportIssue[];
}


export interface ImportCommitResult {
    batchId: string;

    filename: string;
    totalRows: number;

    importedCount: number;
    updatedCount: number;
    reviewCount: number;
    rejectedCount: number;
    failedCount: number;

    status:
        | "COMPLETED"
        | "PARTIAL_SUCCESS"
        | "REVIEW_REQUIRED"
        | "FAILED";

    rows: ImportCommitRowResult[];
}