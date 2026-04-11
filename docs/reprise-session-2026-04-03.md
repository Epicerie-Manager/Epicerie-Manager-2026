# Reprise session — 3 avril 2026

## État général

- Branche de travail : `main`
- Dernière version poussée en ligne : `0.6.73`
- Dernier commit poussé : `add90a0`
- Les gros chantiers `Exports` et `Infos` avancées ont été intégrés et sont désormais en ligne

## Ce qui a été poussé en ligne pendant cette session

### Absences

- `v0.6.68`
  - correction du faux effet de duplication lors de l'approbation d'une nouvelle demande d'absence
  - stabilisation des identifiants UI des demandes pour éviter les collisions d'affichage

- `v0.6.69`
  - ajout de `TOUS LES EMPLOYES` dans `Nouvelle demande` côté manager
  - création rapide d'un jour férié ou d'une absence globale sans passer employé par employé

### Exports / impressions

- `v0.6.67`
  - mise en ligne du menu `Exports & impressions`
  - impressions dédiées pour :
    - `Planning équipe`
    - `Contrôle balisage`
    - `Plan TG/GB`
  - suppression des anciens boutons d'impression intégrés au module `Planning`

- `v0.6.72`
  - suppression du badge `Repère` à côté de `CECILE` dans l'export planning

- `v0.6.73`
  - suppression de la tuile `Repère du mois` dans l'export `Contrôle balisage`

### Planning

- `v0.6.67`
  - amélioration de la saisie des horaires avec liste de créneaux normalisés
  - normalisation automatique des formats d'horaires
  - si un horaire est saisi sur une case `Non travaillé`, la case bascule automatiquement en `Présent`
  - surbrillance de ligne par collaborateur et surbrillance de colonne au survol
  - ouverture directe de la vue `Jour` du planning depuis le dashboard

### Dashboard

- `v0.6.67`
  - cartes `Alertes à lire en premier` rendues réellement cliquables
  - tuile `Semaine` cliquable vers le planning en vue `Jour`
  - détails des jours concernés ajoutés pour l'alerte planning

### Absences / risque

- `v0.6.67`
  - affichage des pastilles `Demande à risque` et `Risque critique` dans le module `Absences`
  - cohérence restaurée avec les alertes du dashboard

### Balisage

- `v0.6.67`
  - ajout des variations `vs mois préc.` dans l'export `Contrôle balisage`
  - ajout du même indicateur dans la vue équipe du menu `Balisage`

### Infos / annonces avancées

- `v0.6.70`
  - annonces programmées avec date/heure de début et date/heure de fin
  - ciblage `toute l'équipe`, `collaborateurs ciblés`, `rayons ciblés`
  - confirmation de lecture côté collaborateur
  - suivi manager des annonces avec destinataires, vus et confirmés
  - badges collab désormais branchés sur les statuts Supabase pour cette fonctionnalité

- `v0.6.71`
  - correction du cas où une annonce était créée dans `annonces` sans que ses destinataires ne soient correctement insérés
  - rollback si l'insertion dans `annonce_recipients` échoue
  - message d'erreur plus explicite quand le problème vient des droits/policies Supabase

## Patches SQL créés / utilisés aujourd'hui

### Déjà utilisés ou à conserver

- [docs/sql/2026-04-01-add-employees-tg-rayons.sql](D:/Epicerie%20Manager%202026/docs/sql/2026-04-01-add-employees-tg-rayons.sql)
  - ajout de `employees.tg_rayons`

- [supabase/patch_annonces_urgent.sql](D:/Epicerie%20Manager%202026/supabase/patch_annonces_urgent.sql)
  - autorise `urgent` dans `annonces.niveau`

- [docs/sql/2026-04-03-annonces-ciblees-programmees-confirmations.sql](D:/Epicerie%20Manager%202026/docs/sql/2026-04-03-annonces-ciblees-programmees-confirmations.sql)
  - enrichit `annonces`
  - crée `annonce_recipients`

- [docs/sql/2026-04-03-annonce-recipients-policies.sql](D:/Epicerie%20Manager%202026/docs/sql/2026-04-03-annonce-recipients-policies.sql)
  - ajoute les grants et policies RLS sur `annonce_recipients`
  - manager : lecture/écriture complète
  - collaborateur : lecture + mise à jour/insert de ses propres lignes

## Ce qui fonctionne maintenant sur le module Infos

### Manager

Fichiers principaux :
- [src/app/infos/page.tsx](D:/Epicerie%20Manager%202026/src/app/infos/page.tsx)
- [src/lib/infos-store.ts](D:/Epicerie%20Manager%202026/src/lib/infos-store.ts)
- [src/lib/infos-data.ts](D:/Epicerie%20Manager%202026/src/lib/infos-data.ts)

Fonctionnalités :
- création d'annonce simple
- création d'annonce programmée
- ciblage par collaborateurs
- ciblage par rayons
- option `confirmation de lecture demandée`
- suivi des destinataires
- suivi `vu`
- suivi `confirmé`

### Collaborateur

Fichiers principaux :
- [src/app/collab/infos/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/infos/page.tsx)
- [src/app/collab/home/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/home/page.tsx)
- [src/app/collab/more/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/more/page.tsx)

Fonctionnalités :
- affichage uniquement des annonces actives et concernées
- marquage `vu` dès la consultation
- bouton `Confirmer la lecture`
- badges d'accueil et de `Plus` basés sur Supabase pour cette fonctionnalité

## Fichiers importants touchés aujourd'hui

- [src/app/absences/page.tsx](D:/Epicerie%20Manager%202026/src/app/absences/page.tsx)
- [src/app/collab/home/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/home/page.tsx)
- [src/app/collab/infos/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/infos/page.tsx)
- [src/app/collab/more/page.tsx](D:/Epicerie%20Manager%202026/src/app/collab/more/page.tsx)
- [src/app/infos/page.tsx](D:/Epicerie%20Manager%202026/src/app/infos/page.tsx)
- [src/app/page.tsx](D:/Epicerie%20Manager%202026/src/app/page.tsx)
- [src/components/exports/BalisageExportSheet.tsx](D:/Epicerie%20Manager%202026/src/components/exports/BalisageExportSheet.tsx)
- [src/components/exports/PlanningExportSheet.tsx](D:/Epicerie%20Manager%202026/src/components/exports/PlanningExportSheet.tsx)
- [src/components/exports/planning-print-utils.ts](D:/Epicerie%20Manager%202026/src/components/exports/planning-print-utils.ts)
- [src/components/planning/planning-epiceriebis.jsx](D:/Epicerie%20Manager%202026/src/components/planning/planning-epiceriebis.jsx)
- [src/lib/absences-data.ts](D:/Epicerie%20Manager%202026/src/lib/absences-data.ts)
- [src/lib/absences-store.ts](D:/Epicerie%20Manager%202026/src/lib/absences-store.ts)
- [src/lib/collab-data.ts](D:/Epicerie%20Manager%202026/src/lib/collab-data.ts)
- [src/lib/infos-data.ts](D:/Epicerie%20Manager%202026/src/lib/infos-data.ts)
- [src/lib/infos-store.ts](D:/Epicerie%20Manager%202026/src/lib/infos-store.ts)

## Vérifications faites

- `npm run lint` relancé plusieurs fois pendant la session
- `npm run build` relancé plusieurs fois pendant la session
- dernier état en fin de soirée :
  - lint OK
  - build OK

## Point d'attention pour demain

- Tester en conditions réelles le module `Infos` avancé :
  - annonce ciblée collaborateur
  - annonce ciblée rayon
  - annonce programmée
  - confirmation de lecture côté collab
  - remontée manager

- Vérifier que les policies `annonce_recipients` sont bien stables en usage réel

- Continuer uniquement si besoin sur :
  - ergonomie du manager `Infos`
  - notifications push éventuelles plus tard
  - mode manager mobile plus tard

## Fichiers non suivis présents localement

- `.codex-dev.log`
- `AUDIT_ABSENCES.md`
- [docs/reprise-session-2026-04-03.md](D:/Epicerie%20Manager%202026/docs/reprise-session-2026-04-03.md)
- `scripts/create-collabs.mjs`
- `scripts/diag-collab-auth.ts`
- `scripts/reset-passwords.mjs`
- `scripts/reset-pin-6digits.mjs`

Ces fichiers ne font pas partie du déploiement courant et ne doivent pas être poussés par erreur sans validation explicite.
