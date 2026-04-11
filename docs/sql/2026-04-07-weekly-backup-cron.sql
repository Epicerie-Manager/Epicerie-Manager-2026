-- Backup hebdomadaire Supabase Storage + notification email
-- Bucket cible : `backups`
-- Edge Function : `weekly-backup`
--
-- Important :
-- - pg_cron fonctionne en UTC
-- - `0 4 * * 0` = dimanche 06:00 en heure francaise d'ete
-- - en heure d'hiver, ce cron tournera a 05:00 heure francaise

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'weekly-backup';

select cron.schedule(
  'weekly-backup',
  '0 4 * * 0',
  $$
  select net.http_post(
    url := 'https://rdngzjonahxqcigufmmf.supabase.co/functions/v1/weekly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

select jobid, jobname, schedule, command
from cron.job
where jobname = 'weekly-backup';
