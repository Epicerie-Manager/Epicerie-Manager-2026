# Audit sécurité `Epicerie Manager 2026`

Date : 4 avril 2026  
Périmètre :
- dashboard bureau
- application manager mobile
- application collaborateur
- Vercel
- Supabase
- exposition de données sans connexion

Objectif :
- identifier les vraies surfaces d’exposition
- distinguer ce qui est visible par design, par erreur, ou par dette technique
- hiérarchiser les risques
- fournir une base claire à transmettre à Claude

## 1. Verdict sécurité rapide

Le projet fonctionne, mais **la posture sécurité actuelle n’est pas encore satisfaisante**.

Le risque principal ne vient pas d’un seul “gros trou”, mais d’un cumul :
- données métier visibles dans le bundle front
- policies Supabase très ouvertes pour le front
- endpoint manager mobile public sans rate limiting
- logique d’identité collaborateur exposée côté client

Conclusion courte :
- **oui, ton ressenti est justifié**
- **oui, certaines données semblent pouvoir être vues sans authentification**
- **oui, il faut traiter ça comme une priorité**

## 2. Constat principal : pourquoi des noms sont visibles sans connexion

Il y a en réalité **plusieurs causes possibles**, et elles se cumulent.

### Cause A. Données embarquées directement dans le code front

Fichiers concernés :
- [D:\Epicerie Manager 2026\src\lib\planning-store.ts](D:\Epicerie%20Manager%202026\src\lib\planning-store.ts)
- [D:\Epicerie Manager 2026\src\lib\rh-store.ts](D:\Epicerie%20Manager%202026\src\lib\rh-store.ts)
- [D:\Epicerie Manager 2026\src\lib\collab-auth.ts](D:\Epicerie%20Manager%202026\src\lib\collab-auth.ts)

Constat :
- des noms de collaborateurs, profils, types, horaires et cycles existent dans le code source front
- ces données peuvent donc se retrouver dans le JavaScript chargé par le navigateur

Conséquence :
- même sans session, certaines données nominatives peuvent être retrouvées en console ou dans les sources téléchargées

Gravité :
- **élevée**

### Cause B. Policies Supabase de lecture publiques

Fichier très important :
- [D:\Epicerie Manager 2026\supabase\patch_rls_front_read.sql](D:\Epicerie%20Manager%202026\supabase\patch_rls_front_read.sql)

Constat :
ce patch crée des policies `to anon, authenticated using (true)` sur des tables métier :
- `employees`
- `planning_entries`
- `cycle_repos`
- `binomes_repos`
- `tri_caddie`
- `plans_tg`
- `plans_tg_entries`
- `balisage_mensuel`
- `absences`
- `documents`
- `annonces`

Conséquence :
- avec la clé `anon`, le front peut lire directement ces données si le patch a bien été appliqué en base
- donc un utilisateur non connecté ou un tiers peut potentiellement lire des données sensibles via Supabase

Gravité :
- **critique**

Remarque :
- il faut vérifier immédiatement si ce patch est réellement appliqué en production
- si oui, c’est probablement la plus grosse priorité sécurité du moment

## 3. Risques sécurité identifiés

### 3.1 Exposition publique des données RH / planning / absences

Source :
- [D:\Epicerie Manager 2026\supabase\patch_rls_front_read.sql](D:\Epicerie%20Manager%202026\supabase\patch_rls_front_read.sql)

Pourquoi c’est grave :
- noms des employés
- types de profils
- horaires
- repos
- absences
- documents
- annonces

peuvent théoriquement être lus avec la clé `anon`.

Risque réel :
- fuite de données internes
- exposition de données personnelles de travail
- exposition d’organisation interne

Priorité :
- **P0**

Action recommandée :
- supprimer les policies `anon using (true)` sur les tables sensibles
- réserver les lectures :
  - soit à `authenticated`
  - soit à des vues filtrées
  - soit à des endpoints serveur dédiés

### 3.2 Mapping collaborateur hardcodé côté client

Fichier :
- [D:\Epicerie Manager 2026\src\lib\collab-auth.ts](D:\Epicerie%20Manager%202026\src\lib\collab-auth.ts)

Constat :
- le front embarque un tableau `COLLAB_PROFILE_MAPPING`
- ce tableau contient :
  - emails
  - `auth_id`
  - `employee_id`

Pourquoi c’est grave :
- cela expose de la structure d’identité interne
- cela facilite la compréhension de la relation entre comptes auth et employés
- cela n’a rien à faire dans un bundle client

Gravité :
- **critique**

Priorité :
- **P0**

Action recommandée :
- supprimer totalement ce mapping du front
- le remplacer par une liaison serveur / base de données

### 3.3 Endpoint public de profils manager

Fichier :
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\profiles\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\profiles\route.ts)

Constat :
- route publique
- utilise le client admin Supabase
- renvoie la liste des managers actifs :
  - `slug`
  - `display_name`
  - `initials`

Conséquence :
- un attaquant peut lister les profils manager mobiles
- cela facilite la phase de ciblage

Gravité :
- **élevée**

Action recommandée :
- au minimum, limiter les données retournées
- idéalement, protéger ou obscurcir davantage l’entrée
- ou remplacer par une liste statique extrêmement réduite côté app manager dédiée si le besoin métier est fixe

### 3.4 Endpoint public de login manager par PIN sans rate limiting

Fichier :
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\login\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\login\route.ts)

Constat :
- endpoint public
- accepte `slug + pin`
- si succès, génère un `magiclink`
- aucune limitation apparente :
  - pas de rate limit
  - pas de throttling
  - pas de blocage progressif

Conséquence :
- brute force du PIN envisageable
- surtout si les profils managers sont listables publiquement

Gravité :
- **critique**

Priorité :
- **P0**

Action recommandée :
- ajouter immédiatement :
  - rate limiting par IP
  - limitation par slug
  - délai progressif après échec
  - journalisation des tentatives

### 3.5 Dépendance service role sur les routes manager mobile

Fichiers :
- [D:\Epicerie Manager 2026\src\lib\supabase-admin.ts](D:\Epicerie%20Manager%202026\src\lib\supabase-admin.ts)
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\login\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\login\route.ts)
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\profiles\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\profiles\route.ts)

Constat :
- ces routes utilisent `SUPABASE_SERVICE_ROLE_KEY`

Conséquence :
- si une route est mal conçue, l’impact est fort
- le service role doit rester extrêmement cantonné

Gravité :
- **élevée**

Action recommandée :
- auditer ces routes comme des surfaces sensibles
- éviter tout endpoint inutile qui tourne avec le service role

### 3.6 Données de secours très détaillées dans les stores

Fichiers :
- [D:\Epicerie Manager 2026\src\lib\rh-store.ts](D:\Epicerie%20Manager%202026\src\lib\rh-store.ts)
- [D:\Epicerie Manager 2026\src\lib\planning-store.ts](D:\Epicerie%20Manager%202026\src\lib\planning-store.ts)

Constat :
- `defaultRhEmployees`
- `defaultRhCycles`
- `sheetPlanningEmployees`
- `sheetPlanningCycle`
- binômes / tri / horaires de secours

Conséquence :
- même si Supabase était fermé proprement, une partie de l’organisation interne resterait visible dans le code front

Gravité :
- **élevée**

Action recommandée :
- réduire fortement les seed data embarquées
- ne garder que du mock de dev hors prod, ou déplacer ces seeds hors bundle public

## 4. Analyse de la surface Supabase

### Ce qui est bon

- le flux manager PIN est structuré autour d’une table dédiée
- le hash du PIN repose sur `crypt` / `pgcrypto`
- la table `manager_mobile_access` a des policies restrictives côté table

Fichier :
- [D:\Epicerie Manager 2026\docs\sql\2026-04-04-manager-mobile-pin-access.sql](D:\Epicerie%20Manager%202026\docs\sql\2026-04-04-manager-mobile-pin-access.sql)

### Ce qui est mauvais ou à risque

- la table `manager_mobile_access` est bien verrouillée, mais l’endpoint public qui la lit contourne ce verrou via service role
- le patch `patch_rls_front_read.sql` ouvre très largement les données métier

### Diagnostic sécurité Supabase

Si `patch_rls_front_read.sql` a été appliqué tel quel en production, alors :
- la sécurité actuelle des lectures métier est insuffisante
- l’auth seule ne suffit plus à protéger les données

## 5. Analyse de la surface Vercel

### Ce qui est bon

- le split du projet manager a permis d’éviter certains mélanges bureau/mobile
- la désactivation PWA côté manager dédié a réduit les collisions

### Ce qui est à surveiller

- deux projets Vercel = deux surfaces de configuration
- les env vars doivent être strictement cohérentes
- les routes serveur sensibles tournent côté Vercel avec accès service role

### Action recommandée

- documenter un inventaire des variables requises par projet
- limiter les routes API exposées publiquement
- mettre en place de la journalisation et du rate limiting sur les endpoints sensibles

## 6. Classification des risques

### P0 — À corriger immédiatement

1. Policies Supabase publiques sur tables métier si elles sont bien actives en prod
2. Mapping collaborateur hardcodé côté front
3. Absence de rate limiting sur le login manager PIN

### P1 — À corriger très vite

4. Endpoint public de listing des profils manager
5. Réduction des données seed visibles dans le front
6. Audit table par table des lectures réellement nécessaires côté anon

### P2 — À planifier

7. Nettoyage des reliquats d’auth et de routes
8. Réduction de la logique sensible côté client
9. Documentation sécurité / déploiement

## 7. Recommandations concrètes

### Recommandation 1

Revoir immédiatement les policies Supabase de lecture.

Objectif :
- ne plus avoir `to anon using (true)` sur les tables sensibles

### Recommandation 2

Sortir du front :
- `COLLAB_PROFILE_MAPPING`
- les seeds RH nominatives
- les seeds planning nominatives si elles ne sont pas strictement nécessaires

### Recommandation 3

Sécuriser le manager PIN :
- rate limit
- blocage progressif
- éventuellement challenge supplémentaire après plusieurs échecs

### Recommandation 4

Repenser le endpoint `/api/manager-mobile/profiles` :
- soit le minimiser fortement
- soit le protéger autrement
- soit accepter le compromis produit, mais en ayant conscience du coût sécurité

### Recommandation 5

Créer un mini audit technique “lecture publique nécessaire ou non” pour chaque table :
- `employees`
- `absences`
- `planning_entries`
- `cycle_repos`
- `tri_caddie`
- `balisage_mensuel`
- `documents`
- `annonces`

## 8. Ce qu’il faut vérifier tout de suite en prod

Checklist :

1. Les policies de `patch_rls_front_read.sql` sont-elles réellement actives en production ?
2. Un utilisateur totalement non connecté peut-il interroger `employees` avec la clé `anon` ?
3. Un utilisateur totalement non connecté peut-il interroger `absences` avec la clé `anon` ?
4. L’endpoint manager profiles est-il accessible publiquement ?
5. Le login manager PIN peut-il être spammé sans limitation ?
6. Le bundle collaborateur embarque-t-il toujours le mapping complet ?

## 9. Verdict sécurité honnête

Le projet n’est pas “cassé”, mais il n’est **pas encore durci**.

Ma lecture honnête :
- sécurité produit : moyenne
- sécurité authentification : moyenne à fragile
- sécurité données : potentiellement insuffisante si les policies publiques sont en prod

La phrase la plus importante de cet audit est :

> Le risque principal n’est pas seulement une faille ponctuelle, mais une exposition trop large de données métier via le front et via des policies de lecture trop ouvertes.

## 10. Message court à envoyer à Claude

Tu peux lui envoyer ça :

> Fais un audit sécurité de ce projet Next.js / Supabase / Vercel.  
> Je veux que tu challengest particulièrement :
> - les policies RLS Supabase
> - la présence de données RH/planning hardcodées dans le front
> - le mapping collaborateur embarqué dans le client
> - l’endpoint public de profils manager mobile
> - le login manager mobile par PIN sans rate limiting apparent
>  
> Merci de me dire :
> - ce qui est réellement critique
> - ce qui peut attendre
> - ce qu’il faut corriger immédiatement
> - comment sécuriser l’auth manager mobile proprement

## 11. Mon avis final

Si je devais choisir une seule priorité immédiate, ce serait :

1. vérifier et corriger les RLS Supabase de lecture

Puis juste derrière :

2. retirer le mapping collaborateur hardcodé
3. ajouter du rate limiting au manager PIN

Ce sont les trois chantiers sécurité les plus rentables.
