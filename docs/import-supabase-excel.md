# Import Excel vers Supabase

Script d'import:

```bash
npm run import:supabase
```

Mode simulation (aucune ecriture):

```bash
npm run import:supabase -- --dry-run
```

Fichiers pris par defaut:

- `C:/Users/Maison/Desktop/Planning Epicerie 2026.xlsx`
- `C:/Users/Maison/Desktop/PLAN TG EPICERIE 2026.xlsx`
- `C:/Users/Maison/Desktop/Suivi contrôle balisage - épicerie 2026.xlsx`

Override des chemins:

```bash
npm run import:supabase -- --planning=\"C:/.../Planning.xlsx\" --tg=\"C:/.../PLAN TG.xlsx\" --balisage=\"C:/.../balisage.xlsx\"
```

## Authentification ecriture

Le RLS bloque l'ecriture avec la cle anon. Il faut une de ces options:

1. `SUPABASE_SERVICE_ROLE_KEY` (recommande pour l'import admin)
2. `SUPABASE_MANAGER_EMAIL` + `SUPABASE_MANAGER_PASSWORD`

Les variables peuvent etre ajoutees dans `.env.local` avant execution.

## Tables ciblees

- `employees`
- `planning_entries`
- `cycle_repos`
- `binomes_repos`
- `tri_caddie`
- `plans_tg`
- `plans_tg_entries`
- `balisage_mensuel`
- `absences` (best effort, ignoree si schema different)

