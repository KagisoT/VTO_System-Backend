import {
    PoolClient,
    QueryResultRow
} from "pg";

import { BaseRepository } from "./base.repository";


// =========================================================
// TYPES
// =========================================================

export interface DebtLookupReferences {
    jbInternalRef?: string | null;
    jabulaniAccountNo?: string | null;
    contractNumber?: string | null;
    loanId?: string | null;
}


export interface ExistingClient {
    id: string;
    idNumber: string | null;
}


export interface ExistingDebtMatch {
    debtId: string;
    matchedBy: string[];
}


export interface CreateImportBatchPayload {
    filename: string;
    source: string | null;
    uploadedBy: string;
    totalRows: number;
}


export interface ImportBatch {
    id: string;
    filename: string;
    source: string | null;
    uploadedBy: string;
    status: string;
    totalRows: number;
}


export interface CompleteImportBatchPayload {
    batchId: string;

    status:
        | "COMPLETED"
        | "PARTIAL_SUCCESS"
        | "REVIEW_REQUIRED"
        | "FAILED";

    importedCount: number;
    createdCount: number;
    updatedCount: number;
    warningCount: number;
    reviewCount: number;
    rejectedCount: number;
    failedCount: number;

    errorSummary?: string | null;
}


export interface ImportRowPersistencePayload {
    batchId: string;
    sourceRow: number;

    decision:
        | "CREATE"
        | "UPDATE"
        | "REVIEW_REQUIRED"
        | "REJECTED";

    matchedClientId?: string | null;
    matchedDebtId?: string | null;

    matchedBy?: string[];

    raw: Record<string, any>;
    normalized: Record<string, any>;

    issues?: any[];
}


export interface FailedImportRowPayload
    extends ImportRowPersistencePayload {

    error: string;
}


export interface CommitValidatedRowPayload
    extends ImportRowPersistencePayload {

    decision:
        | "CREATE"
        | "UPDATE";
}


export interface CommitValidatedRowResult {
    importRowId: string;
    clientId: string;
    debtId: string;

    decision:
        | "CREATE"
        | "UPDATE";
}


// =========================================================
// INTERNAL DATABASE ROW TYPES
// =========================================================

interface ClientRow extends QueryResultRow {
    id: string;
    id_number: string;
}


interface DebtRow extends QueryResultRow {
    debt_id: string;
}


interface ImportBatchRow extends QueryResultRow {
    id: string;
    filename: string;
    source: string | null;
    uploaded_by: string;
    status: string;
    total_rows: number;
}


interface ImportRowInsertResult extends QueryResultRow {
    id: string;
}


// =========================================================
// REPOSITORY
// =========================================================

export class ImportRepository extends BaseRepository {

    // =====================================================
    // CLIENT LOOKUP
    // =====================================================

    async findClientByIdNumber(
        idNumber: string
    ): Promise<ExistingClient | null> {

        const result =
            await this.query<ClientRow>(
                `
                SELECT
                    id,
                    id_number
                FROM clients
                WHERE id_number = $1
                LIMIT 1
                `,
                [idNumber]
            );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            id: result.rows[0].id,
            idNumber: result.rows[0].id_number
        };
    }


    // =====================================================
    // DEBT RECONCILIATION
    // =====================================================

    async findDebtMatches(
        references: DebtLookupReferences
    ): Promise<ExistingDebtMatch[]> {

        const matches =
            new Map<string, Set<string>>();


        const addMatches = (
            rows: DebtRow[],
            matchedBy: string
        ) => {

            for (const row of rows) {

                const debtId =
                    String(row.debt_id);

                if (!matches.has(debtId)) {

                    matches.set(
                        debtId,
                        new Set<string>()
                    );

                }

                matches
                    .get(debtId)!
                    .add(matchedBy);

            }

        };


        // ---------------------------------------------
        // JB INTERNAL REFERENCE
        // ---------------------------------------------

        if (references.jbInternalRef) {

            const result =
                await this.query<DebtRow>(
                    `
                    SELECT debt_id
                    FROM debts
                    WHERE jb_internal_ref = $1
                    `,
                    [
                        references.jbInternalRef
                    ]
                );

            addMatches(
                result.rows,
                "JB_INTERNAL_REF"
            );

        }


        // ---------------------------------------------
        // JABULANI ACCOUNT
        // ---------------------------------------------

        if (references.jabulaniAccountNo) {

            const result =
                await this.query<DebtRow>(
                    `
                    SELECT debt_id
                    FROM debts
                    WHERE jabulani_account_no = $1
                    `,
                    [
                        references.jabulaniAccountNo
                    ]
                );

            addMatches(
                result.rows,
                "JABULANI_ACCOUNT"
            );

        }


        // ---------------------------------------------
        // CONTRACT NUMBER
        // ---------------------------------------------

        if (references.contractNumber) {

            const result =
                await this.query<DebtRow>(
                    `
                    SELECT debt_id
                    FROM debts
                    WHERE contract_number = $1
                    `,
                    [
                        references.contractNumber
                    ]
                );

            addMatches(
                result.rows,
                "CONTRACT_NUMBER"
            );

        }


        // ---------------------------------------------
        // LOAN ID
        // ---------------------------------------------

        if (references.loanId) {

            const result =
                await this.query<DebtRow>(
                    `
                    SELECT debt_id
                    FROM debts
                    WHERE loan_id = $1
                    `,
                    [
                        references.loanId
                    ]
                );

            addMatches(
                result.rows,
                "LOAN_ID"
            );

        }


        // ---------------------------------------------
        // EXTENSIBLE REFERENCE TABLE
        // ---------------------------------------------

        const referencePairs = [
            {
                type: "JB_INTERNAL_REF",
                value: references.jbInternalRef
            },
            {
                type: "JABULANI_ACCOUNT",
                value: references.jabulaniAccountNo
            },
            {
                type: "CONTRACT_NUMBER",
                value: references.contractNumber
            },
            {
                type: "LOAN_ID",
                value: references.loanId
            }
        ];


        for (const reference of referencePairs) {

            if (!reference.value) {
                continue;
            }

            const result =
                await this.query<DebtRow>(
                    `
                    SELECT debt_id
                    FROM debt_references
                    WHERE reference_type = $1
                    AND reference_value = $2
                    `,
                    [
                        reference.type,
                        reference.value
                    ]
                );

            addMatches(
                result.rows,
                reference.type
            );

        }


        return Array
            .from(matches.entries())
            .map(
                ([debtId, matchTypes]) => ({
                    debtId,
                    matchedBy:
                        Array.from(matchTypes)
                })
            );
    }


    // =====================================================
    // CREATE IMPORT BATCH
    // =====================================================

    async createImportBatch(
        payload: CreateImportBatchPayload
    ): Promise<ImportBatch> {

        const result =
            await this.query<ImportBatchRow>(
                `
                INSERT INTO import_batches (
                    filename,
                    source,
                    uploaded_by,
                    status,
                    total_rows,
                    processing_started_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    'PROCESSING',
                    $4,
                    NOW()
                )
                RETURNING
                    id,
                    filename,
                    source,
                    uploaded_by,
                    status,
                    total_rows
                `,
                [
                    payload.filename,
                    payload.source,
                    payload.uploadedBy,
                    payload.totalRows
                ]
            );


        const row = result.rows[0];


        return {
            id: row.id,
            filename: row.filename,
            source: row.source,
            uploadedBy: row.uploaded_by,
            status: row.status,
            totalRows: row.total_rows
        };
    }


    // =====================================================
    // RECORD REJECTED ROW
    // =====================================================

    async recordRejectedImportRow(
        payload: ImportRowPersistencePayload
    ): Promise<string> {

        const result =
            await this.query<ImportRowInsertResult>(
                `
                INSERT INTO import_rows (
                    import_batch_id,
                    source_row_number,
                    decision,
                    processing_status,
                    matched_client_id,
                    matched_debt_id,
                    matched_by,
                    raw_data,
                    normalized_data,
                    issues,
                    processed_at
                )
                VALUES (
                    $1,
                    $2,
                    'REJECTED',
                    'REJECTED',
                    $3,
                    $4,
                    $5::jsonb,
                    $6::jsonb,
                    $7::jsonb,
                    $8::jsonb,
                    NOW()
                )
                RETURNING id
                `,
                [
                    payload.batchId,
                    payload.sourceRow,
                    payload.matchedClientId ?? null,
                    payload.matchedDebtId ?? null,
                    JSON.stringify(
                        payload.matchedBy ?? []
                    ),
                    JSON.stringify(payload.raw),
                    JSON.stringify(
                        payload.normalized
                    ),
                    JSON.stringify(
                        payload.issues ?? []
                    )
                ]
            );


        return result.rows[0].id;
    }


    // =====================================================
    // RECORD REVIEW ROW
    // =====================================================

    async recordReviewImportRow(
        payload: ImportRowPersistencePayload
    ): Promise<string> {

        return this.transaction(
            async (
                client: PoolClient
            ): Promise<string> => {

                const rowResult =
                    await client.query<ImportRowInsertResult>(
                        `
                        INSERT INTO import_rows (
                            import_batch_id,
                            source_row_number,
                            decision,
                            processing_status,
                            matched_client_id,
                            matched_debt_id,
                            matched_by,
                            raw_data,
                            normalized_data,
                            issues,
                            processed_at
                        )
                        VALUES (
                            $1,
                            $2,
                            'REVIEW_REQUIRED',
                            'REVIEW_REQUIRED',
                            $3,
                            $4,
                            $5::jsonb,
                            $6::jsonb,
                            $7::jsonb,
                            $8::jsonb,
                            NOW()
                        )
                        RETURNING id
                        `,
                        [
                            payload.batchId,
                            payload.sourceRow,
                            payload.matchedClientId ?? null,
                            payload.matchedDebtId ?? null,
                            JSON.stringify(
                                payload.matchedBy ?? []
                            ),
                            JSON.stringify(
                                payload.raw
                            ),
                            JSON.stringify(
                                payload.normalized
                            ),
                            JSON.stringify(
                                payload.issues ?? []
                            )
                        ]
                    );


                const importRowId =
                    rowResult.rows[0].id;


                const issues =
                    payload.issues ?? [];


                if (issues.length === 0) {

                    await client.query(
                        `
                        INSERT INTO import_review_queue (
                            import_row_id,
                            status,
                            reason_code,
                            reason
                        )
                        VALUES (
                            $1,
                            'OPEN',
                            'REVIEW_REQUIRED',
                            'Import row requires review.'
                        )
                        `,
                        [
                            importRowId
                        ]
                    );

                }

                else {

                    for (const issue of issues) {

                        await client.query(
                            `
                            INSERT INTO import_review_queue (
                                import_row_id,
                                status,
                                reason_code,
                                reason
                            )
                            VALUES (
                                $1,
                                'OPEN',
                                $2,
                                $3
                            )
                            `,
                            [
                                importRowId,
                                issue.code ??
                                    "REVIEW_REQUIRED",
                                issue.message ??
                                    "Import row requires review."
                            ]
                        );

                    }

                }


                return importRowId;
            }
        );
    }


    // =====================================================
    // RECORD FAILED ROW
    // =====================================================

    async recordFailedImportRow(
        payload: FailedImportRowPayload
    ): Promise<string> {

        const result =
            await this.query<ImportRowInsertResult>(
                `
                INSERT INTO import_rows (
                    import_batch_id,
                    source_row_number,
                    decision,
                    processing_status,
                    matched_client_id,
                    matched_debt_id,
                    matched_by,
                    raw_data,
                    normalized_data,
                    issues,
                    error_message,
                    processed_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    'FAILED',
                    $4,
                    $5,
                    $6::jsonb,
                    $7::jsonb,
                    $8::jsonb,
                    $9::jsonb,
                    $10,
                    NOW()
                )
                RETURNING id
                `,
                [
                    payload.batchId,
                    payload.sourceRow,
                    payload.decision,
                    payload.matchedClientId ?? null,
                    payload.matchedDebtId ?? null,
                    JSON.stringify(
                        payload.matchedBy ?? []
                    ),
                    JSON.stringify(payload.raw),
                    JSON.stringify(
                        payload.normalized
                    ),
                    JSON.stringify(
                        payload.issues ?? []
                    ),
                    payload.error
                ]
            );


        return result.rows[0].id;
    }


    // =====================================================
    // COMPLETE IMPORT BATCH
    // =====================================================

    async completeImportBatch(
        payload: CompleteImportBatchPayload
    ): Promise<void> {

        await this.query(
            `
            UPDATE import_batches
            SET
                status = $2,
                imported_rows = $3,
                created_debts = $4,
                updated_debts = $5,
                warning_rows = $6,
                review_rows = $7,
                rejected_rows = $8,
                failed_rows = $9,
                error_summary = $10,
                completed_at = NOW()
            WHERE id = $1
            `,
            [
                payload.batchId,
                payload.status,
                payload.importedCount,
                payload.createdCount,
                payload.updatedCount,
                payload.warningCount,
                payload.reviewCount,
                payload.rejectedCount,
                payload.failedCount,
                payload.errorSummary ?? null
            ]
        );
    }


    // =====================================================
    // COMMIT VALIDATED ROW
    // =====================================================

    async commitValidatedRow(
        payload: CommitValidatedRowPayload
    ): Promise<CommitValidatedRowResult> {

        return this.transaction(
            async (
                client: PoolClient
            ): Promise<CommitValidatedRowResult> => {

                const normalized =
                    payload.normalized;


                // =========================================
                // 1. RESOLVE / CREATE CLIENT
                // =========================================

                const idNumber =
                    this.stringValue(
                        normalized[
                            "Debtor ID or Passport No"
                        ]
                    );


                if (!idNumber) {

                    throw new Error(
                        "Cannot commit import row without debtor ID or passport number."
                    );

                }


                let clientId =
                    payload.matchedClientId ?? null;


                if (!clientId) {

                    const existingClient =
                        await client.query<ClientRow>(
                            `
                            SELECT
                                id,
                                id_number
                            FROM clients
                            WHERE id_number = $1
                            LIMIT 1
                            `,
                            [
                                idNumber
                            ]
                        );


                    if (
                        existingClient.rows.length > 0
                    ) {

                        clientId =
                            existingClient.rows[0].id;

                    }

                }


                if (!clientId) {

                    const firstname =
                        this.requiredString(
                            normalized[
                                "Debtor Firstname"
                            ],
                            "Debtor Firstname"
                        );

                    const surname =
                        this.requiredString(
                            normalized[
                                "Debtor Surname"
                            ],
                            "Debtor Surname"
                        );


                    const clientResult =
                        await client.query<ClientRow>(
                            `
                            INSERT INTO clients (
                                id_number,
                                firstname,
                                second_name,
                                surname,
                                initials,
                                title,
                                home_phone,
                                cell_phone_1,
                                cell_phone_2,
                                work_phone,
                                email_1,
                                email_2,
                                address_line_1,
                                address_line_2,
                                address_line_3,
                                address_line_4,
                                postal_code
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
                                $9,
                                $10,
                                $11,
                                $12,
                                $13,
                                $14,
                                $15,
                                $16,
                                $17
                            )
                            RETURNING
                                id,
                                id_number
                            `,
                            [
                                idNumber,
                                firstname,
                                this.stringValue(
                                    normalized[
                                        "Debtor Second Name"
                                    ]
                                ),
                                surname,
                                this.stringValue(
                                    normalized[
                                        "Debtor Initials"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Debtor Title"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Home Phone 1"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Cell Phone 1"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Cell Phone 2"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Work Phone 1"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Email 1"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Email 2"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Street Address line 1"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Street Address line 2"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Street Address line 3"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Street Address line 4"
                                    ]
                                ),
                                this.stringValue(
                                    normalized[
                                        "Street postal code"
                                    ]
                                )
                            ]
                        );


                    clientId =
                        clientResult.rows[0].id;

                }


                // =========================================
                // 2. CREATE OR UPDATE DEBT
                // =========================================

                let debtId =
                    payload.matchedDebtId ?? null;


                if (
                    payload.decision === "CREATE"
                ) {

                    const debtResult =
                        await client.query<DebtRow>(
                            `
                            INSERT INTO debts (
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
                                status
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
                                $9,
                                $10,
                                $11,
                                $12,
                                $13,
                                $14,
                                $15,
                                $16,
                                $17,
                                $18
                            )
                            RETURNING debt_id
                            `,
                            [
                                clientId,
                                idNumber,

                                this.requiredString(
                                    normalized[
                                        "loan_id"
                                    ],
                                    "loan_id"
                                ),

                                this.requiredString(
                                    normalized[
                                        "contract_number"
                                    ],
                                    "contract_number"
                                ),

                                this.requiredString(
                                    normalized[
                                        "Jabulani Account No OR Reference"
                                    ],
                                    "Jabulani Account No OR Reference"
                                ),

                                this.requiredString(
                                    normalized[
                                        "Jb_internal_reference"
                                    ],
                                    "Jb_internal_reference"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "principal"
                                    ],
                                    "principal"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "initiation_fee"
                                    ],
                                    "initiation_fee"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "service_fee"
                                    ],
                                    "service_fee"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "vat_if"
                                    ],
                                    "vat_if"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "vat_sf"
                                    ],
                                    "vat_sf"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "interest"
                                    ],
                                    "interest"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "calculated_debt"
                                    ],
                                    "calculated_debt"
                                ),

                                this.requiredInteger(
                                    normalized[
                                        "days_overdue"
                                    ],
                                    "days_overdue"
                                ),

                                this.nullableValue(
                                    normalized[
                                        "target_date"
                                    ]
                                ),

                                this.nullableValue(
                                    normalized[
                                        "Date of Default"
                                    ]
                                ),

                                this.stringValue(
                                    normalized[
                                        "assigned_agency"
                                    ]
                                ),

                                "ACTIVE"
                            ]
                        );


                    debtId =
                        debtResult.rows[0].debt_id;

                }

                else {

                    if (!debtId) {

                        throw new Error(
                            "UPDATE import row does not contain a matched debt ID."
                        );

                    }


                    const updateResult =
                        await client.query(
                            `
                            UPDATE debts
                            SET
                                client_id = $2,
                                id_number = $3,

                                loan_id = $4,
                                contract_number = $5,
                                jabulani_account_no = $6,
                                jb_internal_ref = $7,

                                principal = $8,
                                initiation_fee = $9,
                                service_fee = $10,
                                vat_if = $11,
                                vat_sf = $12,
                                interest = $13,
                                calculated_debt = $14,

                                days_overdue = $15,
                                target_date = $16,
                                date_of_default = $17,

                                assigned_agency = $18,

                                updated_at = NOW()

                            WHERE debt_id = $1
                            `,
                            [
                                debtId,
                                clientId,
                                idNumber,

                                this.requiredString(
                                    normalized[
                                        "loan_id"
                                    ],
                                    "loan_id"
                                ),

                                this.requiredString(
                                    normalized[
                                        "contract_number"
                                    ],
                                    "contract_number"
                                ),

                                this.requiredString(
                                    normalized[
                                        "Jabulani Account No OR Reference"
                                    ],
                                    "Jabulani Account No OR Reference"
                                ),

                                this.requiredString(
                                    normalized[
                                        "Jb_internal_reference"
                                    ],
                                    "Jb_internal_reference"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "principal"
                                    ],
                                    "principal"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "initiation_fee"
                                    ],
                                    "initiation_fee"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "service_fee"
                                    ],
                                    "service_fee"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "vat_if"
                                    ],
                                    "vat_if"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "vat_sf"
                                    ],
                                    "vat_sf"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "interest"
                                    ],
                                    "interest"
                                ),

                                this.requiredNumber(
                                    normalized[
                                        "calculated_debt"
                                    ],
                                    "calculated_debt"
                                ),

                                this.requiredInteger(
                                    normalized[
                                        "days_overdue"
                                    ],
                                    "days_overdue"
                                ),

                                this.nullableValue(
                                    normalized[
                                        "target_date"
                                    ]
                                ),

                                this.nullableValue(
                                    normalized[
                                        "Date of Default"
                                    ]
                                ),

                                this.stringValue(
                                    normalized[
                                        "assigned_agency"
                                    ]
                                )
                            ]
                        );


                    if (
                        updateResult.rowCount === 0
                    ) {

                        throw new Error(
                            `Matched debt ${debtId} no longer exists.`
                        );

                    }

                }


                if (!debtId) {

                    throw new Error(
                        "Debt ID was not resolved during import commit."
                    );

                }


                // =========================================
                // 3. STORE EXTERNAL REFERENCES
                // =========================================

                await this.upsertDebtReference(
                    client,
                    debtId,
                    "JB_INTERNAL_REF",
                    this.stringValue(
                        normalized[
                            "Jb_internal_reference"
                        ]
                    )
                );


                await this.upsertDebtReference(
                    client,
                    debtId,
                    "JABULANI_ACCOUNT",
                    this.stringValue(
                        normalized[
                            "Jabulani Account No OR Reference"
                        ]
                    )
                );


                await this.upsertDebtReference(
                    client,
                    debtId,
                    "CONTRACT_NUMBER",
                    this.stringValue(
                        normalized[
                            "contract_number"
                        ]
                    )
                );


                await this.upsertDebtReference(
                    client,
                    debtId,
                    "LOAN_ID",
                    this.stringValue(
                        normalized[
                            "loan_id"
                        ]
                    )
                );


                // =========================================
                // 4. RECORD IMPORT ROW
                // =========================================

                const processingStatus =
                    payload.decision === "CREATE"
                        ? "IMPORTED"
                        : "UPDATED";


                const importRowResult =
                    await client.query<ImportRowInsertResult>(
                        `
                        INSERT INTO import_rows (
                            import_batch_id,
                            source_row_number,
                            decision,
                            processing_status,
                            matched_client_id,
                            matched_debt_id,
                            matched_by,
                            raw_data,
                            normalized_data,
                            issues,
                            processed_at
                        )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7::jsonb,
                            $8::jsonb,
                            $9::jsonb,
                            $10::jsonb,
                            NOW()
                        )
                        RETURNING id
                        `,
                        [
                            payload.batchId,
                            payload.sourceRow,
                            payload.decision,
                            processingStatus,
                            clientId,
                            debtId,

                            JSON.stringify(
                                payload.matchedBy ?? []
                            ),

                            JSON.stringify(
                                payload.raw
                            ),

                            JSON.stringify(
                                payload.normalized
                            ),

                            JSON.stringify(
                                payload.issues ?? []
                            )
                        ]
                    );


                const importRowId =
                    importRowResult.rows[0].id;


                // =========================================
                // 5. STORE BANK SNAPSHOT
                // =========================================

                await client.query(
                    `
                    INSERT INTO debt_bank_snapshots (
                        debt_id,
                        import_batch_id,
                        import_row_id,
                        snapshot_data
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4::jsonb
                    )
                    `,
                    [
                        debtId,
                        payload.batchId,
                        importRowId,
                        JSON.stringify(
                            payload.normalized
                        )
                    ]
                );


                return {
                    importRowId,
                    clientId,
                    debtId,
                    decision:
                        payload.decision
                };
            }
        );
    }


    // =====================================================
    // PRIVATE: DEBT REFERENCE
    // =====================================================

    private async upsertDebtReference(
        client: PoolClient,
        debtId: string,
        referenceType: string,
        referenceValue: string | null
    ): Promise<void> {

        if (!referenceValue) {
            return;
        }


        await client.query(
            `
            INSERT INTO debt_references (
                debt_id,
                reference_type,
                reference_value
            )
            VALUES (
                $1,
                $2,
                $3
            )
            ON CONFLICT (
                debt_id,
                reference_type,
                reference_value
            )
            DO NOTHING
            `,
            [
                debtId,
                referenceType,
                referenceValue
            ]
        );
    }


    // =====================================================
    // PRIVATE: VALUE HELPERS
    // =====================================================

    private nullableValue(
        value: any
    ): any {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        return value;
    }


    private stringValue(
        value: any
    ): string | null {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }


        const stringValue =
            String(value).trim();


        if (
            stringValue === "" ||
            stringValue.toLowerCase() === "nan"
        ) {
            return null;
        }


        return stringValue;
    }


    private requiredString(
        value: any,
        fieldName: string
    ): string {

        const result =
            this.stringValue(value);


        if (!result) {

            throw new Error(
                `${fieldName} is required for database commit.`
            );

        }


        return result;
    }


    private requiredNumber(
        value: any,
        fieldName: string
    ): number {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            throw new Error(
                `${fieldName} is required for database commit.`
            );

        }


        const numericValue =
            typeof value === "number"
                ? value
                : Number(value);


        if (
            !Number.isFinite(
                numericValue
            )
        ) {

            throw new Error(
                `${fieldName} must be numeric.`
            );

        }


        if (numericValue < 0) {

            throw new Error(
                `${fieldName} cannot be negative.`
            );

        }


        return numericValue;
    }


    private requiredInteger(
        value: any,
        fieldName: string
    ): number {

        const numericValue =
            this.requiredNumber(
                value,
                fieldName
            );


        if (
            !Number.isInteger(
                numericValue
            )
        ) {

            throw new Error(
                `${fieldName} must be an integer.`
            );

        }


        return numericValue;
    }

}