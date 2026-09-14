-- Update days_overdue for active debts
UPDATE debts
SET days_overdue = GREATEST(0, (CURRENT_DATE - date_of_default)),
    updated_at = now()
WHERE status = 'ACTIVE' AND date_of_default IS NOT NULL;
