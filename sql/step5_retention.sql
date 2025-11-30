-- sql/step5_retention.sql
-- Retention: delete debriefs and certificates older than 365 days.
-- Safe to run manually or via a scheduler.

-- Delete debriefs older than 365 days
DELETE FROM public.debriefs
WHERE created_at < (now() - interval '365 days');

-- Delete certificates older than 365 days (or expired earlier)
DELETE FROM public.certificates
WHERE valid_until < (now() - interval '365 days');

-- You can run this periodically (daily) to reclaim space.
