# RETOUR CODEX

## Analyse du brief PWA collaborateur

Date : 2026-03-29

### Points a ajuster avant implementation

1. Le brief mentionne `lib/supabase/client.ts`, mais le projet utilise actuellement [src/lib/supabase.ts](D:/Epicerie%20Manager%202026/src/lib/supabase.ts).

2. Le brief mentionne `next.config.js`, mais le depot utilise actuellement [next.config.ts](D:/Epicerie%20Manager%202026/next.config.ts).

3. Le brief s'appuie sur une colonne `first_login` dans `profiles`, alors que le flux manager actuellement en place repose sur `password_changed`, visible dans [src/app/login/page.tsx](D:/Epicerie%20Manager%202026/src/app/login/page.tsx) et [supabase/patch_profiles_auth.sql](D:/Epicerie%20Manager%202026/supabase/patch_profiles_auth.sql).

4. Le middleware existant dans [middleware.ts](D:/Epicerie%20Manager%202026/middleware.ts) redirige aujourd'hui les utilisateurs non connectes vers `/login` manager. Il faudra l'etendre avec prudence pour prendre en charge `/collab/login` sans casser l'existant.

5. Le brief indique de ne jamais toucher aux modules manager existants. En pratique, l'ajout de la PWA collaborateur demandera quand meme une extension minimale de [middleware.ts](D:/Epicerie%20Manager%202026/middleware.ts) et de [next.config.ts](D:/Epicerie%20Manager%202026/next.config.ts), car ce sont des points d'entree transverses.

6. Le brief suppose que les policies RLS collaborateur sont deja correctes pour tous les cas d'usage mentionnes. Il faudra verifier avant implementation que les lectures `planning_entries`, `absence_requests`, `documents`, `annonces`, `plans_tg` et `plans_tg_entries` couvrent bien le flux collaborateur reel attendu.

### Dependance ajoutee

- `next-pwa` a ete installee pour activer la PWA collaborateur dans [next.config.ts](D:/Epicerie%20Manager%202026/next.config.ts).

### Recommandation

Avant de coder la PWA collaborateur, valider le contrat de donnees exact sur `profiles` et la strategie d'authentification a retenir :

- soit conserver `first_login` si cette colonne existe bien en base
- soit reutiliser `password_changed`
- soit ajouter une couche d'adaptation propre entre les deux
