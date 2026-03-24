# Patch RLS Frontend (lecture anon)

Fichier SQL a executer:

- `supabase/patch_rls_front_read.sql`

## Execution

1. Ouvrir Supabase Dashboard > `SQL Editor`.
2. Coller le contenu de `supabase/patch_rls_front_read.sql`.
3. Executer le script.

## Verification rapide

Dans SQL Editor, tester:

```sql
select count(*) from public.employees;
select count(*) from public.planning_entries;
select count(*) from public.plans_tg_entries;
```

Puis relancer le front (`npm run dev`) et verifier:

- `Infos` charge documents/annonces.
- `Planning` charge les employes + overrides.
- `Plan TG` et `Balisage` chargent les donnees.

## Important

- `SUPABASE_SERVICE_ROLE_KEY` reste strictement cote serveur (script d'import).
- Le front continue d'utiliser uniquement `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
