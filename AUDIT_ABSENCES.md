# AUDIT_ABSENCES

Date : 2026-03-30

Objet :
- cartographier toutes les liaisons actuelles autour des absences
- identifier les usages de `absences` et `absence_requests`
- recenser les comparaisons / ecritures de statuts
- lister l'etat actuel observable des tables cote code
- poser un constat de ce qui fonctionne et de ce qui est casse

Important :
- ce document est un audit statique du depot
- il ne modifie aucun fichier métier
- l'etat des colonnes de tables ci-dessous correspond aux colonnes explicitement referencees dans le code et les scripts du depot
- ce n'est pas une introspection live garantie de la base Supabase

## 1. Constat d'ensemble

Le domaine métier "absences" est aujourd'hui porte par deux tables :

- `public.absences`
- `public.absence_requests`

Le projet ne traite plus ces deux tables comme des domaines separés. Au contraire, plusieurs ecrans et stores :

- lisent les deux tables
- fusionnent les lignes
- dedoublonnent tant bien que mal
- synchronisent des statuts entre les deux
- tentent de supprimer des "jumeaux" logiques dans les deux tables
- projettent les deux tables dans le planning
- projettent les deux tables dans la PWA collaborateur

Conclusion d'architecture :
- `absences` n'est plus la seule source de verite
- `absence_requests` n'est pas non plus une source isolee
- on est dans un mode "double source + synchronisation applicative"
- c'est ce point qui fragilise le systeme

## 2. Fichiers qui importent, lisent ou manipulent `absences` / `absence_requests`

### 2.1 Fichiers qui interrogent directement Supabase

#### [D:\Epicerie Manager 2026\src\lib\absences-store.ts](D:\Epicerie%20Manager%202026\src\lib\absences-store.ts)

Role :
- store manager central pour les absences

Ce qu'il fait :
- lit `absences`
- lit `absence_requests`
- fusionne les deux jeux de donnees dans un snapshot unique front
- normalise les statuts
- met a jour un statut manager
- supprime une demande
- tente de synchroniser des lignes "jumelles" entre les deux tables
- resynchronise le planning apres certaines actions

Tables lues / ecrites :
- `absences`
- `absence_requests`

Fonctions sensibles :
- `createAbsenceRequestInSupabase()`
- `updateAbsenceStatusInSupabase()`
- `deleteAbsenceRequestInSupabase()`
- `syncAbsencesFromSupabase()`
- `syncPlanningStatusToAbsenceInSupabase()`
- `syncTwinAbsenceRows()`

#### [D:\Epicerie Manager 2026\src\lib\collab-data.ts](D:\Epicerie%20Manager%202026\src\lib\collab-data.ts)

Role :
- facade data de la PWA collaborateur

Ce qu'il fait :
- lit les absences collaborateur dans `absence_requests`
- lit aussi les absences manager dans `absences`
- fusionne les deux pour l'onglet `Absences` collaborateur
- projette les absences approuvees des deux tables dans le planning collaborateur
- insere les nouvelles demandes collaborateur dans `absence_requests`

Tables lues / ecrites :
- `absences`
- `absence_requests`
- `planning_entries`
- `cycle_repos`

Fonctions sensibles :
- `getMyWeekPlanning()`
- `getMyMonthPlanning()`
- `getMyAbsences()`
- `createAbsenceRequest()`
- `getApprovedCollabAbsenceRows()`

#### [D:\Epicerie Manager 2026\src\lib\planning-store.ts](D:\Epicerie%20Manager%202026\src\lib\planning-store.ts)

Role :
- store du planning manager

Ce qu'il fait vis-a-vis des absences :
- lit les absences approuvees dans `absences`
- lit aussi les demandes approuvees dans `absence_requests`
- projette les deux sur les overrides du planning manager
- calcule donc le planning avec une source double

Tables lues :
- `absences`
- `absence_requests`
- `planning_entries`
- `cycle_repos`

Point sensible :
- le planning manager n'est plus base uniquement sur `absences`

### 2.2 Fichiers qui consomment indirectement le store / les donnees absences

#### [D:\Epicerie Manager 2026\src\app\absences\page.tsx](D:\Epicerie%20Manager%202026\src\app\absences\page.tsx)

Role :
- ecran manager `Demandes d'absence`

Ce qu'il fait :
- charge le snapshot unifie via `loadAbsenceRequests()`
- relance `syncAbsencesFromSupabase()`
- cree des demandes manager via `createAbsenceRequestInSupabase()`
- met a jour les statuts via `updateAbsenceStatusInSupabase()`
- supprime via `deleteAbsenceRequestInSupabase()`
- relance la projection vers le planning via `syncPlanningFromAbsenceRequest()`

Important :
- cet ecran n'est plus un simple ecran CRUD sur une table unique
- il pilote un systeme de fusion

#### [D:\Epicerie Manager 2026\src\app\page.tsx](D:\Epicerie%20Manager%202026\src\app\page.tsx)

Role :
- dashboard manager

Ce qu'il fait :
- charge le snapshot unifie des absences via `loadAbsenceRequests()`
- relance `syncAbsencesFromSupabase()`
- calcule les KPI et la vue dashboard sur la base fusionnee

Impact :
- le dashboard n'est plus base uniquement sur `absences`

#### [D:\Epicerie Manager 2026\src\components\planning\planning-epiceriebis.jsx](D:\Epicerie%20Manager%202026\src\components\planning\planning-epiceriebis.jsx)

Role :
- vue planning manager

Ce qu'il fait :
- charge le snapshot fusionne d'absences via `loadAbsenceRequests()`
- relance `syncAbsencesFromSupabase()`
- utilise les demandes `EN_ATTENTE` dans la vue planning

Impact :
- le planning manager lit indirectement le melange des deux tables

#### [D:\Epicerie Manager 2026\src\app\collab\absences\page.tsx](D:\Epicerie%20Manager%202026\src\app\collab\absences\page.tsx)

Role :
- onglet `Absences` de la PWA collaborateur

Ce qu'il fait :
- lit `getMyAbsences()`
- donc lit indirectement `absence_requests` + `absences`

#### [D:\Epicerie Manager 2026\src\app\collab\planning\page.tsx](D:\Epicerie%20Manager%202026\src\app\collab\planning\page.tsx)

Role :
- onglet `Planning` de la PWA collaborateur

Ce qu'il fait :
- lit `getMyWeekPlanning()` et `getMyMonthPlanning()`
- donc depend de `planning_entries`, `cycle_repos`, `absences`, `absence_requests`

#### [D:\Epicerie Manager 2026\src\app\collab\home\page.tsx](D:\Epicerie%20Manager%202026\src\app\collab\home\page.tsx)

Role :
- page d'accueil de la PWA collaborateur

Ce qu'il fait :
- lit `getMyWeekPlanning()` pour aujourd'hui / demain
- donc depend aussi de la reconstruction via `planning_entries` + `cycle_repos` + absences fusionnees

#### [D:\Epicerie Manager 2026\src\components\collab\layout.tsx](D:\Epicerie%20Manager%202026\src\components\collab\layout.tsx)

Role :
- layout et navigation basse de la PWA collaborateur

Ce qu'il fait vis-a-vis des absences :
- lit `getMyAbsences()` pour afficher la pastille `Absences`
- donc recharge lui aussi les absences fusionnees

### 2.3 Fichiers qui ne lisent pas directement la base mais restent sensibles au statut absence

#### [D:\Epicerie Manager 2026\src\lib\planning-presence.ts](D:\Epicerie%20Manager%202026\src\lib\planning-presence.ts)

Role :
- calcul des presences / effectifs

Ce qu'il fait :
- traite les absences approuvees au format front unifie (`status === "APPROUVE"`)

#### [D:\Epicerie Manager 2026\src\components\absences\timeline-suivi.tsx](D:\Epicerie%20Manager%202026\src\components\absences\timeline-suivi.tsx)

Role :
- timeline manager des absences

Ce qu'il fait :
- consomme le type front `AbsenceRequest`
- raisonne en statuts front unifies uppercase

## 3. Endroits ou les statuts sont compares ou ecrits

Le projet manipule actuellement deux conventions de statuts :

- convention front / manager / store :
  - `APPROUVE`
  - `EN_ATTENTE`
  - `REFUSE`

- convention base `absence_requests` :
  - `approuve`
  - `en_attente`
  - `refuse`

### 3.1 Ecritures de statuts

#### [D:\Epicerie Manager 2026\src\lib\absences-store.ts](D:\Epicerie%20Manager%202026\src\lib\absences-store.ts)

- insertion manager dans `absences`
  - ecrit : `EN_ATTENTE`
  - ligne : `statut: input.status ?? "EN_ATTENTE"`

- update d'un statut dans une table cible
  - passe par `getAbsenceStatusForDb()`

- `getAbsenceStatusForDb(status, table)`
  - si table = `absence_requests`
    - `EN_ATTENTE` -> `en_attente`
    - `REFUSE` -> `refuse`
    - sinon -> `approuve`
  - si table = `absences`
    - ecrit le statut front tel quel

- sync planning -> absences manager
  - ecrit toujours `APPROUVE` dans `absences`

### 3.2 Comparaisons / normalisations de statuts

#### [D:\Epicerie Manager 2026\src\lib\absences-store.ts](D:\Epicerie%20Manager%202026\src\lib\absences-store.ts)

- `normalizeAbsenceStatus()`
  - lit toute casse et normalise vers :
    - `REFUSE`
    - `EN_ATTENTE`
    - `APPROUVE`

#### [D:\Epicerie Manager 2026\src\lib\collab-data.ts](D:\Epicerie%20Manager%202026\src\lib\collab-data.ts)

- `normalizeCollabAbsenceStatus()`
  - lit en lowercase souple :
    - contient `ref` -> `refuse`
    - contient `appr` -> `approuve`
    - sinon -> `en_attente`

- `getApprovedCollabAbsenceRows()`
  - conserve les lignes dont le statut normalise vaut `approuve`
  - donc accepte potentiellement `APPROUVE` et `approuve`

#### [D:\Epicerie Manager 2026\src\lib\planning-store.ts](D:\Epicerie%20Manager%202026\src\lib\planning-store.ts)

- lit `absences` avec filtre strict SQL :
  - `.eq("statut", "APPROUVE")`

- lit `absence_requests` avec filtre strict SQL :
  - `.eq("statut", "approuve")`

Important :
- ici la casse est hard-codee par table

#### [D:\Epicerie Manager 2026\src\app\absences\page.tsx](D:\Epicerie%20Manager%202026\src\app\absences\page.tsx)

- toute la page manager raisonne avec :
  - `EN_ATTENTE`
  - `APPROUVE`
  - `REFUSE`

#### [D:\Epicerie Manager 2026\src\app\collab\absences\page.tsx](D:\Epicerie%20Manager%202026\src\app\collab\absences\page.tsx)

- la PWA collaborateur convertit en lowercase :
  - `status.includes("attente")`
  - `status.includes("appr")`
  - `status.includes("ref")`

#### [D:\Epicerie Manager 2026\src\components\collab\layout.tsx](D:\Epicerie%20Manager%202026\src\components\collab\layout.tsx)

- la pastille `Absences` cherche des lignes dont le `statut` contient :
  - `appr`
  - `refus`
  - `refuse`

#### [D:\Epicerie Manager 2026\src\lib\planning-presence.ts](D:\Epicerie%20Manager%202026\src\lib\planning-presence.ts)

- le calcul de presence travaille avec :
  - `absence.status !== "APPROUVE"`

Conclusion statut :
- le projet ne travaille pas avec une seule convention
- il maintient un pont permanent entre uppercase front et lowercase `absence_requests`

## 4. Etat actuel observable de chaque table

Cette section liste les colonnes explicitement referencees dans le code.

### 4.1 Table `absences`

Colonnes referencees dans le code :
- `id`
- `employee_id`
- `type`
- `date_debut`
- `date_fin`
- `statut`
- `note`
- `created_at`
- `updated_at` (prise en charge generique lors des tris / timestamps)

Colonnes probablement utilisees au runtime front unifie :
- `id`
- `employee_id`
- `type`
- `date_debut`
- `date_fin`
- `statut`
- `note`

Usages principaux :
- saisie manager
- projection planning manager
- projection planning collaborateur
- lecture collaborateur d'absences manager
- dashboard manager

Contrainte RLS vue dans le depot :
- lecture publique/authentifiee activee dans [D:\Epicerie Manager 2026\supabase\patch_rls_front_read.sql](D:\Epicerie%20Manager%202026\supabase\patch_rls_front_read.sql)

### 4.2 Table `absence_requests`

Colonnes referencees dans le code :
- `id`
- `employee_id`
- `type`
- `date_debut`
- `date_fin`
- `nb_jours`
- `nb_jours_ouvres`
- `statut`
- `note`
- `created_at`
- `updated_at`
- `motif_refus` ou `reason` (lecture cote PWA collaborateur pour affichage)

Valeurs `type` attendues par le code :
- `CP`
- `RTT` (legacy tolere)
- `DEPLACEMENT_RH`
- `MAL`
- `EVENEMENT`
- `AUTRE`

Usages principaux :
- creation de demande depuis la PWA collaborateur
- lecture PWA collaborateur
- validation manager
- projection planning manager si approuvee
- fusion dans dashboard / manager / planning

Constat :
- `absence_requests` est aujourd'hui traitee comme une table metier a part entiere
- mais aussi comme une source secondaire a synchroniser vers `absences`

## 5. Chronologie des changements qui ont touche l'architecture absences

Version de reference probable avant derive :
- `v0.6.24` / commit `29442d4`

Point de bascule :
- `v0.6.25`

### v0.6.25
- le store manager et le dashboard commencent a synchroniser `absences` et `absence_requests`
- premiere vraie fusion de deux sources metier

### v0.6.27
- correction du mapping de statut pour `absence_requests`
- reconnaissance explicite d'une convention de statuts differente

### v0.6.29
- le planning manager commence aussi a prendre en compte `absence_requests`

### v0.6.30
- la PWA collaborateur commence a lire aussi `absences`

### v0.6.33
- ajout de correctifs defensifs pour contenir les demandes fantomes et les regressions de planning

Conclusion :
- a partir de `v0.6.25`, on est dans une architecture de fusion applicative entre deux tables

## 6. Ce qui fonctionne en ce moment

Cette section combine :
- l'etat du code actuel
- les verifications deja faites pendant la session
- les retours utilisateur constates

### Ce qui semble fonctionner

- connexion PWA collaborateur :
  - `/collab/login`
  - `/collab/pin`
  - changement de PIN a `6` chiffres
  - session collaborateur fonctionnelle

- affichage du nom collaborateur :
  - ex. `Bonjour ABDOU.`

- navigation PWA collaborateur :
  - `Accueil`
  - `Planning`
  - `Absences`
  - `Plus`

- creation de demande collaborateur :
  - une demande saisie depuis `/collab/absences/new` remonte bien cote manager

- validation / refus manager :
  - le changement d'etat est visible sur l'application collaborateur

- pastille de retour sur le menu `Absences` collaborateur :
  - fonctionne apres reponse manager

- dashboard / manager `Demandes d'absence` :
  - voit les demandes collaborateur

## 7. Ce qui est casse ou instable en ce moment

### 7.1 Suppression / resurrection de demandes

Symptome remonte :
- une demande supprimee cote manager disparait puis revient

Explication probable :
- la suppression peut enlever une ligne source
- mais une ligne logique jumelle subsiste dans l'autre table
- la fusion recharge ensuite cette autre ligne

### 7.2 Planning manager encore impacte par des absences supprimees

Symptome remonte :
- une absence supprimee dans `Demandes d'absence` peut rester visible dans le planning

Explication probable :
- le planning relit `absences` + `absence_requests`
- une des deux sources peut encore projeter l'absence

### 7.3 PWA collaborateur : absences toujours visibles apres suppression manager

Symptome remonte :
- des absences test supprimees restent visibles dans l'application collaborateur

Explication probable :
- meme cause : fusion de deux sources + dedoublonnage imparfait

### 7.4 PWA collaborateur : planning vide / accueil en erreur

Symptome remonte :
- `Aujourd'hui` / `Demain` vides
- `Certaines informations collaborateur n'ont pas pu etre chargees`
- planning semaine / mois vide

Cause probable identifiee dans le code :
- le planning collaborateur depend de :
  - `planning_entries`
  - `cycle_repos`
  - `absences`
  - `absence_requests`
- la reconstruction est aujourd'hui plus complexe qu'au debut
- tout echec partiel dans cette chaine peut vider l'affichage

### 7.5 Statuts a double convention

Symptome structurel :
- une partie du code attend `APPROUVE`
- une autre attend `approuve`

Risque :
- un oubli de conversion suffit a casser :
  - la validation manager
  - la lecture planning
  - le filtrage collaborateur

### 7.6 Couplage fort entre manager, planning et collaborateur

Constat :
- une action absence touche maintenant potentiellement :
  - manager `Absences`
  - dashboard
  - planning manager
  - PWA collaborateur `Absences`
  - PWA collaborateur `Planning`
  - pastille du menu collaborateur

Risque :
- regression en cascade

## 8. Conclusion d'audit

Etat actuel :
- le projet ne repose plus sur une source unique pour les absences
- il repose sur une logique de fusion applicative entre `absences` et `absence_requests`

Point de fragilite principal :
- la duplication metier entre les deux tables

Version de reference avant derive :
- `v0.6.24`

Diagnostic de synthese :
- si l'objectif est la stabilite, le chantier a traiter n'est pas "un bug de plus"
- c'est une remise a plat du modele de donnees absences

## 9. Recommandation pour la migration

Avant toute migration :
- choisir une table canonique unique
- ne plus laisser manager, planning et collaborateur lire deux tables en parallele

Choix possibles :
- garder `absences` comme source unique
- ou garder `absence_requests` comme source unique

Mais dans tous les cas :
- une seule table doit devenir la source d'autorite
- l'autre doit etre migree puis sortie du circuit de lecture metier
