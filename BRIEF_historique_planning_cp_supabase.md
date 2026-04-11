# BRIEF CLAUDE — Historique du Planning CP + persistance Supabase

## Contexte fonctionnel

Nous avons ajouté dans l'application un nouvel export **Planning CP** destiné à
l'impression A3 paysage.

Ce planning permet aujourd'hui :

- de choisir un **titre libre**
- de choisir une **plage de dates**
- d'afficher une frise hebdomadaire des absences sur la période
- d'afficher les **CP approuvés**
- d'afficher aussi le **congé sans solde**
- d'ajouter manuellement des périodes pour **Farida**, car elle ne doit pas être
  gérée comme une employée RH normale dans l'application
- d'imprimer le rendu directement

Le problème actuel :

- les données du planning CP ne sont **pas historisées**
- les périodes manuelles de **Farida** ne sont **pas persistées**
- si on change la période ou si on recharge, il faut tout ressaisir
- il n'existe pas de moyen de rouvrir un ancien planning CP préparé auparavant

L'objectif est donc de créer une vraie **persistance Supabase** pour :

1. stocker les préparations / impressions de planning CP
2. stocker les périodes manuelles associées à un planning CP
3. pouvoir recharger un ancien planning CP sans ressaisie

---

## Ce qui existe déjà dans l'application

### Côté UI / pages

- `src/app/exports/cp/page.tsx`
  - écran de préparation du planning CP
  - titre libre
  - plage de dates
  - ajout manuel des périodes Farida

- `src/app/exports/cp/print/page.tsx`
  - route d'impression

- `src/components/exports/CpPrintPageClient.tsx`
  - charge les données nécessaires à l'impression

- `src/components/exports/CpExportSheet.tsx`
  - rendu imprimable A3
  - structure proche du planning magasin
  - sections :
    - coordo matin
    - collaborateurs matin
    - coordo après-midi
    - collaborateurs après-midi
    - étudiants
  - Farida est affichée en ligne spéciale manuelle

- `src/components/exports/cp-print-utils.ts`
  - utilitaires de période
  - semaines ISO
  - parsing / sérialisation des périodes manuelles Farida

### Côté données

- les absences normales viennent déjà de Supabase via `absences`
- le planning CP filtre actuellement les absences approuvées de type :
  - `CP`
  - `CONGE_SANS_SOLDE`

- Farida n'est **pas** stockée dans les employés RH pour ce besoin
- ses périodes sont aujourd'hui uniquement saisies dans l'écran et transmises à
  l'impression, sans persistance durable

---

## Besoin produit

Nous voulons pouvoir :

- cliquer sur **Enregistrer** un planning CP préparé
- retrouver ensuite un **historique** des plannings CP enregistrés
- rouvrir un planning CP existant avec :
  - son titre
  - sa plage de dates
  - ses périodes Farida
- éviter de ressaisir Farida à chaque fois

Important :

- on ne veut pas juste stocker Farida “en global”
- on veut stocker **un état de préparation de planning CP**
- chaque planning CP doit pouvoir avoir ses propres périodes manuelles

---

## Recommandation de modélisation Supabase

### 1. Table principale : `planning_cp_exports`

Une ligne = une préparation / version enregistrée de planning CP

Colonnes proposées :

- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `start_date date not null`
- `end_date date not null`
- `site text null`
- `notes text null`
- `created_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Optionnel mais utile :

- `is_archived boolean not null default false`

### 2. Table liée : `planning_cp_manual_absences`

Une ligne = une période manuelle rattachée à un planning CP

Colonnes proposées :

- `id uuid primary key default gen_random_uuid()`
- `export_id uuid not null references planning_cp_exports(id) on delete cascade`
- `employee_name text not null`
- `absence_type text not null`
- `start_date date not null`
- `end_date date not null`
- `created_at timestamptz not null default now()`

Contraintes suggérées :

- `employee_name` libre mais utilisé avec la valeur `FARIDA`
- `absence_type` limité à :
  - `CP`
  - `CONGE_SANS_SOLDE`

---

## Pourquoi cette structure

Cette modélisation permet :

- d'avoir un **historique clair** des plannings CP enregistrés
- de rattacher proprement les absences manuelles à un planning précis
- de restaurer fidèlement une préparation enregistrée
- d'étendre plus tard à d'autres cas manuels que Farida si besoin

Exemple :

- export A = `Planning CP été 2026`
- période = `2026-06-01` → `2026-10-31`
- absences manuelles liées :
  - `FARIDA / CP / 2026-07-27 → 2026-08-22`

Quand on recharge l'export A, on retrouve exactement cet état.

---

## Ce qu'il faut préparer côté Supabase

Claude doit proposer :

1. le SQL de création des deux tables
2. les index utiles
3. une stratégie RLS simple et cohérente

### Index recommandés

Pour `planning_cp_exports`

- index sur `created_at desc`
- index sur `(start_date, end_date)`

Pour `planning_cp_manual_absences`

- index sur `export_id`
- index sur `(employee_name, start_date, end_date)`

### RLS

Le plus simple au départ :

- lecture / écriture réservée aux managers authentifiés
- pas d'accès collaborateur

Si le projet utilise déjà les mêmes conventions RLS que les autres modules
manager, les reprendre.

---

## Ce qu'il faudra ensuite brancher dans l'application

Après création des tables, il faudra implémenter côté code :

### A. Un store ou module dédié

Créer par exemple :

- `src/lib/planning-cp-store.ts`

Responsabilités :

- charger l'historique des exports CP
- créer un export CP
- mettre à jour un export CP
- charger les absences manuelles Farida d'un export
- remplacer les absences manuelles d'un export

### B. Dans `src/app/exports/cp/page.tsx`

Ajouter :

- un bouton **Enregistrer**
- une zone **Historique des plannings CP**
- la possibilité de cliquer sur un export existant pour le recharger

Au chargement d'un export :

- remettre le `title`
- remettre `startIso`
- remettre `endIso`
- remettre les périodes Farida

### C. Dans `src/components/exports/cp-print-utils.ts`

Conserver le format courant des périodes Farida, mais prévoir les conversions
vers / depuis les lignes Supabase.

### D. Règle produit proposée

Quand on clique sur **Enregistrer** :

- si aucun export courant n'est sélectionné, créer un nouvel export
- si un export courant est déjà ouvert, mettre à jour cet export

---

## Hypothèses de travail

- Farida reste un cas manuel, non intégré aux employés RH
- ses périodes sont enregistrées avec `employee_name = 'FARIDA'`
- type par défaut pour Farida :
  - `CP`
- mais on doit garder la possibilité future d'enregistrer aussi :
  - `CONGE_SANS_SOLDE`

---

## Demande à Claude

Prépare :

1. le schéma SQL complet Supabase
2. les contraintes / index
3. la proposition RLS
4. si besoin les migrations SQL prêtes à coller

En gardant en tête que l'application devra ensuite consommer ces tables depuis :

- `src/app/exports/cp/page.tsx`
- `src/app/exports/cp/print/page.tsx`
- `src/components/exports/CpPrintPageClient.tsx`
- `src/components/exports/CpExportSheet.tsx`
- `src/components/exports/cp-print-utils.ts`

---

## Résultat attendu après implémentation complète

- un planning CP peut être enregistré
- Farida reste enregistrée avec ce planning
- on peut recharger un ancien planning CP
- on peut le réimprimer sans ressaisie
- on garde un historique propre des préparations
