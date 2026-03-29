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

## Etat d'avancement apres implementation

Date : 2026-03-29

### Ce qui a ete implemente

- creation du socle PWA collaborateur sous `/collab`
- ajout des ecrans :
  - `/collab/login`
  - `/collab/pin`
  - `/collab/change-pin`
  - `/collab/home`
  - `/collab/planning`
  - `/collab/absences`
  - `/collab/absences/new`
  - `/collab/more`
- ajout des helpers :
  - [src/lib/collab-auth.ts](D:/Epicerie%20Manager%202026/src/lib/collab-auth.ts)
  - [src/lib/collab-data.ts](D:/Epicerie%20Manager%202026/src/lib/collab-data.ts)
- extension du [middleware.ts](D:/Epicerie%20Manager%202026/middleware.ts) pour separer les flux manager et collaborateur
- ajout de la PWA :
  - [public/manifest.json](D:/Epicerie%20Manager%202026/public/manifest.json)
  - icones dans [public/icons](D:/Epicerie%20Manager%202026/public/icons)
  - integration `next-pwa` dans [next.config.ts](D:/Epicerie%20Manager%202026/next.config.ts)

### Corrections faites pendant l'integration

- correction du build Vercel en forçant webpack pour `build`
- correction du build local en forçant webpack pour `dev`
- correction du prerender de `/collab/pin` avec separation page serveur / composant client
- correction de la redirection parasite vers `/login` manager en isolant les routes `/collab/*` du shell manager

### Etat fonctionnel actuel

- l'interface collaborateur s'affiche correctement en local et sur Vercel
- la navigation de base `/collab/login` puis `/collab/pin` fonctionne
- le message `PIN incorrect` s'affiche bien dans l'interface
- le blocage restant principal est l'authentification reelle des comptes collaborateurs

### Point de blocage probable

Le flux actuellement implemente ne connecte pas un collaborateur via un email libre ou un "compte test" abstrait. Il fonctionne ainsi :

1. l'utilisateur choisit un nom RH dans `employees`
2. le code fabrique un email technique a partir de ce nom
3. il tente un `signInWithPassword` Supabase avec cet email et le PIN saisi

Exemple actuel :

- `ABDOU` devient `abdou@ep.fr`

Donc si le compte de test annonce par Claude etait `test.collab@ep.fr / 0000`, ce compte n'est jamais appele par le flux actuel tant qu'`ABDOU` est mappe vers `abdou@ep.fr`.

### Ce qu'il faut verifier cote Supabase

- existence d'un utilisateur `auth.users` pour chaque collaborateur teste
- coherence entre l'email auth et l'email fabrique par le front
- presence d'une ligne `profiles` pour ce meme utilisateur
- `profiles.role = 'collaborateur'`
- `profiles.employee_id` renseigne et relie au bon employe RH
- colonne `first_login` bien presente et exploitable pour le flux collaborateur

### Recommandation immediate

Deux strategies possibles :

- Strategie A : garder le mapping automatique actuel
  - creer ou verifier de vrais comptes auth du type `abdou@ep.fr`
  - lier ces comptes a `profiles` avec `role = collaborateur`

- Strategie B : changer le mapping front
  - faire pointer `ABDOU` vers un compte test specifique comme `test.collab@ep.fr`
  - utile pour une phase de demonstration rapide, mais moins propre pour la generalisation

### Conclusion

Le socle front et le routage sont en place. Le principal chantier restant pour faire fonctionner la connexion reelle n'est probablement plus l'UI, mais l'alignement entre :

- `employees`
- `profiles`
- `auth.users`
- et la convention d'email utilisee pour les collaborateurs
