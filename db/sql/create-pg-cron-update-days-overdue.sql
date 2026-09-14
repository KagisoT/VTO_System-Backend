-- Create pg_cron extension and schedule a job to update days_overdue at midnight UTC daily
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'update_days_overdue',
  '0 0 * * *',
  $$
    UPDATE debts
    SET days_overdue = GREATEST(0, CURRENT_DATE - date_of_default),
        updated_at = now()
    WHERE status = 'ACTIVE' AND date_of_default IS NOT NULL;
  $$
);
