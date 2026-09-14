import {
    ImportRepository,
    CommitValidatedRowResult
} from "../../repositories/import.repository";

import {
    ImportDecision,
    ImportIssue,
    ImportValidationRequest,
    ImportValidationResult,
    ImportValidationRow
} from "./import.types";


// =========================================================
// COMMIT TYPES
// =========================================================

export interface ImportCommitRequest
    extends ImportValidationRequest {}


export interface ImportCommitRowResult {

    sourceRow: number;

    status:
        | "IMPORTED"
        | "UPDATED"
        | "REVIEW_REQUIRED"
        | "REJECTED"
        | "FAILED";

    decision: ImportDecision;

    clientId: string | null;
    debtId: string | null;

    error?: string;
}


export interface ImportCommitResult {

    batchId: string;

    filename: string;

    status:
        | "COMPLETED"
        | "PARTIAL_SUCCESS"
        | "REVIEW_REQUIRED"
        | "FAILED";

    totalRows: number;

    importedCount: number;
    createdCount: number;
    updatedCount: number;

    warningCount: number;
    reviewCount: number;
    rejectedCount: number;
    failedCount: number;

    rows: ImportCommitRowResult[];
}


// =========================================================
// SERVICE
// =========================================================

export class ImportService {

    constructor(
        private readonly repository: ImportRepository
    ) {}


    // =====================================================
    // VALIDATE IMPORT
    // =====================================================

    async validateImport(
        payload: ImportValidationRequest
    ): Promise<ImportValidationResult> {

        this.validateRequest(payload);

        return this.buildValidationResult(
            payload
        );
    }


    // =====================================================
    // COMMIT IMPORT
    // =====================================================

    async commitImport(
        payload: ImportCommitRequest,
        uploadedBy: string
    ): Promise<ImportCommitResult> {

        this.validateRequest(payload);


        if (!uploadedBy) {

            throw new Error(
                "Authenticated user is required to commit an import."
            );

        }


        // -------------------------------------------------
        // IMPORTANT:
        // Never trust an earlier /validate response.
        //
        // The entire import is validated again against the
        // current database state immediately before commit.
        // -------------------------------------------------

        const validation =
            await this.buildValidationResult(
                payload
            );


        const batch =
            await this.repository.createImportBatch({
                filename: payload.filename,
                source:
                    payload.source ?? null,
                uploadedBy,
                totalRows:
                    payload.rows.length
            });


        let createdCount = 0;
        let updatedCount = 0;

        let reviewCount = 0;
        let rejectedCount = 0;
        let failedCount = 0;

        let warningCount = 0;


        const rowResults:
            ImportCommitRowResult[] = [];


        // =================================================
        // PROCESS EACH ROW INDEPENDENTLY
        // =================================================

        for (
            const validatedRow
            of validation.rows
        ) {

            const hasWarning =
                validatedRow.issues.some(
                    issue =>
                        issue.severity ===
                        "WARNING"
                );


            if (hasWarning) {
                warningCount++;
            }


            // =============================================
            // REJECTED
            // =============================================

            if (
                validatedRow.decision ===
                "REJECTED"
            ) {

                await this.repository
                    .recordRejectedImportRow({

                        batchId:
                            batch.id,

                        sourceRow:
                            validatedRow.sourceRow,

                        decision:
                            "REJECTED",

                        matchedClientId:
                            validatedRow
                                .matchedClientId
                                ?? null,

                        matchedDebtId:
                            validatedRow
                                .matchedDebtId
                                ?? null,

                        matchedBy:
                            validatedRow.matchedBy,

                        raw:
                            validatedRow.raw,

                        normalized:
                            validatedRow.normalized,

                        issues:
                            validatedRow.issues
                    });


                rejectedCount++;


                rowResults.push({

                    sourceRow:
                        validatedRow.sourceRow,

                    status:
                        "REJECTED",

                    decision:
                        "REJECTED",

                    clientId:
                        validatedRow
                            .matchedClientId
                            ?? null,

                    debtId:
                        validatedRow
                            .matchedDebtId
                            ?? null
                });


                continue;
            }


            // =============================================
            // REVIEW REQUIRED
            // =============================================

            if (
                validatedRow.decision ===
                "REVIEW_REQUIRED"
            ) {

                await this.repository
                    .recordReviewImportRow({

                        batchId:
                            batch.id,

                        sourceRow:
                            validatedRow.sourceRow,

                        decision:
                            "REVIEW_REQUIRED",

                        matchedClientId:
                            validatedRow
                                .matchedClientId
                                ?? null,

                        matchedDebtId:
                            validatedRow
                                .matchedDebtId
                                ?? null,

                        matchedBy:
                            validatedRow.matchedBy,

                        raw:
                            validatedRow.raw,

                        normalized:
                            validatedRow.normalized,

                        issues:
                            validatedRow.issues
                    });


                reviewCount++;


                rowResults.push({

                    sourceRow:
                        validatedRow.sourceRow,

                    status:
                        "REVIEW_REQUIRED",

                    decision:
                        "REVIEW_REQUIRED",

                    clientId:
                        validatedRow
                            .matchedClientId
                            ?? null,

                    debtId:
                        validatedRow
                            .matchedDebtId
                            ?? null
                });


                continue;
            }


            // =============================================
            // CREATE / UPDATE
            // =============================================

            try {

                const committed:
                    CommitValidatedRowResult =
                    await this.repository
                        .commitValidatedRow({

                            batchId:
                                batch.id,

                            sourceRow:
                                validatedRow
                                    .sourceRow,

                            decision:
                                validatedRow
                                    .decision,

                            matchedClientId:
                                validatedRow
                                    .matchedClientId
                                    ?? null,

                            matchedDebtId:
                                validatedRow
                                    .matchedDebtId
                                    ?? null,

                            matchedBy:
                                validatedRow
                                    .matchedBy,

                            raw:
                                validatedRow.raw,

                            normalized:
                                validatedRow
                                    .normalized,

                            issues:
                                validatedRow
                                    .issues
                        });


                if (
                    committed.decision ===
                    "CREATE"
                ) {

                    createdCount++;

                }

                else {

                    updatedCount++;

                }


                rowResults.push({

                    sourceRow:
                        validatedRow.sourceRow,

                    status:
                        committed.decision ===
                        "CREATE"
                            ? "IMPORTED"
                            : "UPDATED",

                    decision:
                        committed.decision,

                    clientId:
                        committed.clientId,

                    debtId:
                        committed.debtId
                });

            }

            catch (error) {

                const message =
                    error instanceof Error
                        ? error.message
                        : "Unknown import row failure";


                // -----------------------------------------
                // commitValidatedRow rolled its transaction
                // back before we arrive here.
                //
                // We can therefore safely persist a FAILED
                // import_rows record afterwards.
                // -----------------------------------------

                await this.repository
                    .recordFailedImportRow({

                        batchId:
                            batch.id,

                        sourceRow:
                            validatedRow.sourceRow,

                        decision:
                            validatedRow.decision,

                        matchedClientId:
                            validatedRow
                                .matchedClientId
                                ?? null,

                        matchedDebtId:
                            validatedRow
                                .matchedDebtId
                                ?? null,

                        matchedBy:
                            validatedRow.matchedBy,

                        raw:
                            validatedRow.raw,

                        normalized:
                            validatedRow.normalized,

                        issues:
                            validatedRow.issues,

                        error:
                            message
                    });


                failedCount++;


                rowResults.push({

                    sourceRow:
                        validatedRow.sourceRow,

                    status:
                        "FAILED",

                    decision:
                        validatedRow.decision,

                    clientId:
                        validatedRow
                            .matchedClientId
                            ?? null,

                    debtId:
                        validatedRow
                            .matchedDebtId
                            ?? null,

                    error:
                        message
                });

            }

        }


        // =================================================
        // FINAL COUNTS
        // =================================================

        const importedCount =
            createdCount +
            updatedCount;


        const batchStatus =
            this.determineBatchStatus({

                importedCount,
                reviewCount,
                rejectedCount,
                failedCount
            });


        // =================================================
        // COMPLETE BATCH
        // =================================================

        await this.repository
            .completeImportBatch({

                batchId:
                    batch.id,

                status:
                    batchStatus,

                importedCount,

                createdCount,

                updatedCount,

                warningCount,

                reviewCount,

                rejectedCount,

                failedCount,

                errorSummary:
                    failedCount > 0
                        ? `${failedCount} row(s) failed during database commit.`
                        : null
            });


        return {

            batchId:
                batch.id,

            filename:
                payload.filename,

            status:
                batchStatus,

            totalRows:
                payload.rows.length,

            importedCount,

            createdCount,

            updatedCount,

            warningCount,

            reviewCount,

            rejectedCount,

            failedCount,

            rows:
                rowResults
        };
    }


    // =====================================================
    // BUILD COMPLETE VALIDATION RESULT
    // =====================================================

    private async buildValidationResult(
        payload: ImportValidationRequest
    ): Promise<ImportValidationResult> {

        const rows:
            ImportValidationRow[] = [];


        for (
            let index = 0;
            index < payload.rows.length;
            index++
        ) {

            const raw =
                payload.rows[index];

            const sourceRow =
                index + 2;


            const validated =
                await this.validateRow(
                    raw,
                    sourceRow
                );


            rows.push(validated);
        }


        // -------------------------------------------------
        // Validate conflicts that only become visible when
        // considering the entire spreadsheet.
        // -------------------------------------------------

        this.applyImportReferenceConflicts(
            rows
        );


        const createCount =
            rows.filter(
                row =>
                    row.decision ===
                    "CREATE"
            ).length;


        const updateCount =
            rows.filter(
                row =>
                    row.decision ===
                    "UPDATE"
            ).length;


        const reviewCount =
            rows.filter(
                row =>
                    row.decision ===
                    "REVIEW_REQUIRED"
            ).length;


        const rejectedCount =
            rows.filter(
                row =>
                    row.decision ===
                    "REJECTED"
            ).length;


        return {

            filename:
                payload.filename,

            totalRows:
                rows.length,

            createCount,

            updateCount,

            reviewCount,

            rejectedCount,

            validForCommit:
                reviewCount === 0 &&
                rejectedCount === 0,

            rows
        };
    }


    // =====================================================
    // VALIDATE SINGLE ROW
    // =====================================================

    private async validateRow(
        raw: Record<string, any>,
        sourceRow: number
    ): Promise<ImportValidationRow> {

        const normalized =
            this.normalizeRow(raw);


        const issues:
            ImportIssue[] = [];


        let matchedClientId:
            string | null = null;

        let matchedDebtId:
            string | null = null;

        let matchedBy:
            string[] = [];


        // =================================================
        // ID / PASSPORT
        // =================================================

        const identity =
            this.stringValue(
                normalized[
                    "Debtor ID or Passport No"
                ]
            );


        if (!identity) {

            issues.push({

                field:
                    "Debtor ID or Passport No",

                severity:
                    "ERROR",

                code:
                    "MISSING_IDENTITY",

                message:
                    "Debtor ID or passport number is required."
            });

        }

        else if (
            /^\d+$/.test(identity) &&
            identity.length !== 13
        ) {

            issues.push({

                field:
                    "Debtor ID or Passport No",

                severity:
                    "ERROR",

                code:
                    "INVALID_SA_ID",

                message:
                    "Numeric South African ID numbers must contain exactly 13 digits."
            });

        }


        // =================================================
        // REQUIRED CLIENT FIELDS
        // =================================================

        this.requireStringField(
            normalized,
            "Debtor Firstname",
            issues
        );


        this.requireStringField(
            normalized,
            "Debtor Surname",
            issues
        );


        // =================================================
        // REQUIRED DEBT REFERENCES
        // =================================================
        //
        // These are NOT NULL in the live debts table.
        // The incoming workbook is a full debt-row import,
        // therefore all four must exist before commit.
        // =================================================

        this.requireStringField(
            normalized,
            "contract_number",
            issues
        );


        this.requireStringField(
            normalized,
            "loan_id",
            issues
        );


        this.requireStringField(
            normalized,
            "Jabulani Account No OR Reference",
            issues
        );


        this.requireStringField(
            normalized,
            "Jb_internal_reference",
            issues
        );


        // =================================================
        // MONEY
        // =================================================

        const requiredMoneyFields = [

            "principal",
            "initiation_fee",
            "service_fee",
            "vat_if",
            "vat_sf",
            "interest",
            "calculated_debt"
        ];


        for (
            const field
            of requiredMoneyFields
        ) {

            this.validateRequiredMoneyField(
                normalized,
                field,
                issues
            );

        }


        // Payment amount exists in the workbook but does
        // not belong to the debts table and may be absent.

        this.validateOptionalMoneyField(
            normalized,
            "Amount",
            issues
        );


        // =================================================
        // DAYS OVERDUE
        // =================================================

        const daysOverdue =
            normalized[
                "days_overdue"
            ];


        if (
            daysOverdue === null ||
            daysOverdue === undefined ||
            daysOverdue === ""
        ) {

            issues.push({

                field:
                    "days_overdue",

                severity:
                    "ERROR",

                code:
                    "MISSING_REQUIRED_FIELD",

                message:
                    "days_overdue is required."
            });

        }

        else {

            const number =
                Number(daysOverdue);


            if (
                !Number.isFinite(number) ||
                !Number.isInteger(number)
            ) {

                issues.push({

                    field:
                        "days_overdue",

                    severity:
                        "ERROR",

                    code:
                        "INVALID_INTEGER",

                    message:
                        "days_overdue must be an integer."
                });

            }

            else if (
                number < 0
            ) {

                issues.push({

                    field:
                        "days_overdue",

                    severity:
                        "ERROR",

                    code:
                        "NEGATIVE_DAYS_OVERDUE",

                    message:
                        "days_overdue cannot be negative."
                });

            }

        }


        // =================================================
        // OPTIONAL DATES
        // =================================================

        this.validateOptionalDate(
            normalized,
            "target_date",
            issues
        );


        this.validateOptionalDate(
            normalized,
            "Date of Default",
            issues
        );


        // =================================================
        // STOP ON STRUCTURAL ERRORS
        // =================================================

        if (
            this.hasErrors(issues)
        ) {

            return {

                sourceRow,

                decision:
                    "REJECTED",

                matchedClientId:
                    null,

                matchedDebtId:
                    null,

                matchedBy:
                    [],

                issues,

                normalized,

                raw
            };
        }


        // =================================================
        // CLIENT LOOKUP
        // =================================================

        if (
            identity &&
            /^\d{13}$/.test(identity)
        ) {

            const existingClient =
                await this.repository
                    .findClientByIdNumber(
                        identity
                    );


            matchedClientId =
                existingClient?.id
                ?? null;

        }


        // =================================================
        // DEBT RECONCILIATION
        // =================================================

        const matches =
            await this.repository
                .findDebtMatches({

                    jbInternalRef:
                        this.stringValue(
                            normalized[
                                "Jb_internal_reference"
                            ]
                        ),

                    jabulaniAccountNo:
                        this.stringValue(
                            normalized[
                                "Jabulani Account No OR Reference"
                            ]
                        ),

                    contractNumber:
                        this.stringValue(
                            normalized[
                                "contract_number"
                            ]
                        ),

                    loanId:
                        this.stringValue(
                            normalized[
                                "loan_id"
                            ]
                        )
                });


        // =================================================
        // CONFLICTING DATABASE REFERENCES
        // =================================================

        if (
            matches.length > 1
        ) {

            const allMatchTypes =
                new Set<string>();


            for (
                const match
                of matches
            ) {

                for (
                    const matchType
                    of match.matchedBy
                ) {

                    allMatchTypes.add(
                        matchType
                    );

                }

            }


            issues.push({

                severity:
                    "ERROR",

                code:
                    "CONFLICTING_DEBT_REFERENCES",

                message:
                    "Incoming debt references resolve to more than one existing debt."
            });


            return {

                sourceRow,

                decision:
                    "REVIEW_REQUIRED",

                matchedClientId,

                matchedDebtId:
                    null,

                matchedBy:
                    Array.from(
                        allMatchTypes
                    ),

                issues,

                normalized,

                raw
            };
        }


        // =================================================
        // EXISTING DEBT
        // =================================================

        if (
            matches.length === 1
        ) {

            const match =
                matches[0];


            matchedDebtId =
                match.debtId;

            matchedBy =
                match.matchedBy;


            issues.push({

                severity:
                    "INFO",

                code:
                    "EXISTING_DEBT",

                message:
                    "Existing debt matched by trusted reference."
            });


            return {

                sourceRow,

                decision:
                    "UPDATE",

                matchedClientId,

                matchedDebtId,

                matchedBy,

                issues,

                normalized,

                raw
            };
        }


        // =================================================
        // NEW DEBT
        // =================================================

        issues.push({

            severity:
                "INFO",

            code:
                "NEW_DEBT",

            message:
                "No existing debt matched the supplied references."
        });


        return {

            sourceRow,

            decision:
                "CREATE",

            matchedClientId,

            matchedDebtId:
                null,

            matchedBy:
                [],

            issues,

            normalized,

            raw
        };
    }


    // =====================================================
    // DUPLICATES INSIDE SAME IMPORT
    // =====================================================

    private applyImportReferenceConflicts(
        rows: ImportValidationRow[]
    ): void {

        const referenceFields = [

            {
                field:
                    "Jb_internal_reference",

                type:
                    "JB_INTERNAL_REF"
            },

            {
                field:
                    "Jabulani Account No OR Reference",

                type:
                    "JABULANI_ACCOUNT"
            },

            {
                field:
                    "contract_number",

                type:
                    "CONTRACT_NUMBER"
            },

            {
                field:
                    "loan_id",

                type:
                    "LOAN_ID"
            }
        ];


        for (
            const reference
            of referenceFields
        ) {

            const values =
                new Map<
                    string,
                    ImportValidationRow[]
                >();


            for (
                const row
                of rows
            ) {

                if (
                    row.decision ===
                    "REJECTED"
                ) {
                    continue;
                }


                const value =
                    this.stringValue(
                        row.normalized[
                            reference.field
                        ]
                    );


                if (!value) {
                    continue;
                }


                if (
                    !values.has(value)
                ) {

                    values.set(
                        value,
                        []
                    );

                }


                values
                    .get(value)!
                    .push(row);

            }


            for (
                const [
                    value,
                    duplicateRows
                ]
                of values.entries()
            ) {

                if (
                    duplicateRows.length <= 1
                ) {
                    continue;
                }


                for (
                    const row
                    of duplicateRows
                ) {

                    const alreadyRecorded =
                        row.issues.some(
                            issue =>
                                issue.code ===
                                "DUPLICATE_REFERENCE_IN_IMPORT" &&
                                issue.field ===
                                reference.field
                        );


                    if (
                        !alreadyRecorded
                    ) {

                        row.issues.push({

                            field:
                                reference.field,

                            severity:
                                "ERROR",

                            code:
                                "DUPLICATE_REFERENCE_IN_IMPORT",

                            message:
                                `${reference.type} value "${value}" appears more than once in this import.`
                        });

                    }


                    if (
                        row.decision !==
                        "REJECTED"
                    ) {

                        row.decision =
                            "REVIEW_REQUIRED";

                    }

                }

            }

        }

    }


    // =====================================================
    // REQUEST VALIDATION
    // =====================================================

    private validateRequest(
        payload: ImportValidationRequest
    ): void {

        if (
            !payload ||
            typeof payload !== "object"
        ) {

            throw new Error(
                "Import payload is required."
            );

        }


        if (
            typeof payload.filename !==
                "string" ||
            payload.filename.trim() === ""
        ) {

            throw new Error(
                "Import filename is required."
            );

        }


        if (
            !Array.isArray(
                payload.rows
            )
        ) {

            throw new Error(
                "Import rows must be an array."
            );

        }


        if (
            payload.rows.length === 0
        ) {

            throw new Error(
                "Import contains no rows."
            );

        }

    }


    // =====================================================
    // NORMALIZE ROW
    // =====================================================

    private normalizeRow(
        raw: Record<string, any>
    ): Record<string, any> {

        const normalized:
            Record<string, any> = {};


        for (
            const [
                key,
                value
            ]
            of Object.entries(raw)
        ) {

            normalized[key] =
                this.normalizeValue(
                    key,
                    value
                );

        }


        return normalized;
    }


    // =====================================================
    // NORMALIZE VALUE
    // =====================================================

    private normalizeValue(
        field: string,
        value: any
    ): any {

        if (
            value === null ||
            value === undefined
        ) {

            return null;

        }


        if (
            typeof value ===
            "string"
        ) {

            const trimmed =
                value.trim();


            if (
                trimmed === "" ||
                trimmed.toLowerCase() ===
                    "nan"
            ) {

                return null;

            }


            // ---------------------------------------------
            // Monetary values
            // ---------------------------------------------

            if (
                this.isMoneyField(
                    field
                )
            ) {

                const numeric =
                    this.normalizeNumericString(
                        trimmed
                    );


                if (
                    numeric !== null
                ) {
                    return numeric;
                }

            }


            // ---------------------------------------------
            // Integer
            // ---------------------------------------------

            if (
                field ===
                "days_overdue"
            ) {

                const numeric =
                    Number(trimmed);


                if (
                    Number.isFinite(
                        numeric
                    )
                ) {

                    return numeric;

                }

            }


            // ---------------------------------------------
            // References and IDs remain strings
            // ---------------------------------------------

            return trimmed;
        }


        // References coming from Excel as numeric cells
        // must become strings.

        if (
            this.isReferenceField(
                field
            )
        ) {

            return String(value);
        }


        return value;
    }


    // =====================================================
    // MONEY VALIDATION
    // =====================================================

    private validateRequiredMoneyField(
        normalized: Record<string, any>,
        field: string,
        issues: ImportIssue[]
    ): void {

        const value =
            normalized[field];


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "MISSING_REQUIRED_FIELD",

                message:
                    `${field} is required.`
            });


            return;
        }


        this.validateMoneyValue(
            field,
            value,
            issues
        );
    }


    private validateOptionalMoneyField(
        normalized: Record<string, any>,
        field: string,
        issues: ImportIssue[]
    ): void {

        const value =
            normalized[field];


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return;

        }


        this.validateMoneyValue(
            field,
            value,
            issues
        );
    }


    private validateMoneyValue(
        field: string,
        value: any,
        issues: ImportIssue[]
    ): void {

        const numeric =
            typeof value === "number"
                ? value
                : Number(value);


        if (
            !Number.isFinite(
                numeric
            )
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "INVALID_MONEY",

                message:
                    `${field} must contain a numeric value.`
            });


            return;
        }


        if (
            numeric < 0
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "NEGATIVE_MONEY",

                message:
                    `${field} cannot be negative.`
            });

        }

    }


    // =====================================================
    // REQUIRED STRING
    // =====================================================

    private requireStringField(
        normalized: Record<string, any>,
        field: string,
        issues: ImportIssue[]
    ): void {

        if (
            !this.stringValue(
                normalized[field]
            )
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "MISSING_REQUIRED_FIELD",

                message:
                    `${field} is required.`
            });

        }

    }


    // =====================================================
    // OPTIONAL DATE
    // =====================================================

    private validateOptionalDate(
        normalized: Record<string, any>,
        field: string,
        issues: ImportIssue[]
    ): void {

        const value =
            normalized[field];


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return;
        }


        if (
            value instanceof Date
        ) {

            if (
                Number.isNaN(
                    value.getTime()
                )
            ) {

                issues.push({

                    field,

                    severity:
                        "ERROR",

                    code:
                        "INVALID_DATE",

                    message:
                        `${field} contains an invalid date.`
                });

            }


            return;
        }


        if (
            typeof value !==
            "string"
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "INVALID_DATE",

                message:
                    `${field} must contain a valid date.`
            });


            return;
        }


        const timestamp =
            Date.parse(value);


        if (
            Number.isNaN(
                timestamp
            )
        ) {

            issues.push({

                field,

                severity:
                    "ERROR",

                code:
                    "INVALID_DATE",

                message:
                    `${field} contains an invalid date.`
            });

        }

    }


    // =====================================================
    // HELPERS
    // =====================================================

    private hasErrors(
        issues: ImportIssue[]
    ): boolean {

        return issues.some(
            issue =>
                issue.severity ===
                "ERROR"
        );
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


        const result =
            String(value).trim();


        if (
            result === "" ||
            result.toLowerCase() ===
                "nan"
        ) {

            return null;
        }


        return result;
    }


    private normalizeNumericString(
        value: string
    ): number | null {

        let normalized =
            value.replace(/\s/g, "");


        // ---------------------------------------------
        // 1564,61
        // ---------------------------------------------

        if (
            /^-?\d+,\d+$/.test(
                normalized
            )
        ) {

            normalized =
                normalized.replace(
                    ",",
                    "."
                );

        }

        // ---------------------------------------------
        // 1,564.61
        // ---------------------------------------------

        else if (
            /^-?\d{1,3}(,\d{3})+(\.\d+)?$/
                .test(normalized)
        ) {

            normalized =
                normalized.replace(
                    /,/g,
                    ""
                );

        }


        const number =
            Number(normalized);


        if (
            !Number.isFinite(
                number
            )
        ) {

            return null;

        }


        return number;
    }


    private isMoneyField(
        field: string
    ): boolean {

        return [

            "calculated_debt",
            "principal",
            "initiation_fee",
            "vat_if",
            "service_fee",
            "vat_sf",
            "interest",
            "Amount"

        ].includes(field);

    }


    private isReferenceField(
        field: string
    ): boolean {

        return [

            "Debtor ID or Passport No",
            "contract_number",
            "loan_id",
            "Jabulani Account No OR Reference",
            "Jb_internal_reference",
            "Home Phone 1",
            "Cell Phone 1",
            "Cell Phone 2",
            "Work Phone 1",
            "Street postal code"

        ].includes(field);

    }


    // =====================================================
    // BATCH STATUS
    // =====================================================

    private determineBatchStatus(
        counts: {
            importedCount: number;
            reviewCount: number;
            rejectedCount: number;
            failedCount: number;
        }
    ):
        | "COMPLETED"
        | "PARTIAL_SUCCESS"
        | "REVIEW_REQUIRED"
        | "FAILED" {

        if (
            counts.reviewCount > 0
        ) {

            return "REVIEW_REQUIRED";
        }


        if (
            counts.importedCount === 0 &&
            (
                counts.rejectedCount > 0 ||
                counts.failedCount > 0
            )
        ) {

            return "FAILED";
        }


        if (
            counts.rejectedCount > 0 ||
            counts.failedCount > 0
        ) {

            return "PARTIAL_SUCCESS";
        }


        return "COMPLETED";
    }

}