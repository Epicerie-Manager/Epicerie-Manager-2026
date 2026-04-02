alter table if exists public.annonces
drop constraint if exists annonces_niveau_check;

alter table if exists public.annonces
add constraint annonces_niveau_check
check (niveau in ('info', 'important', 'urgent'));
