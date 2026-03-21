# Specification V1 (MVP) - Epicerie Manager 2026

Date de reference : 21 mars 2026
Statut : En cours de validation

## 1. Objectif du document

Ce document fixe une specification MVP exploitable pour terminer la V1.

But :

- verrouiller le perimetre fonctionnel ;
- eviter les demandes floues en cours de route ;
- definir les criteres d'acceptation ;
- preparer la mise en service terrain.

## 2. Etat actuel constate (au 21/03/2026)

Fonctionnel deja en place dans l'application :

- dashboard ;
- module planning ;
- module plan TG ;
- module plan plateau ;
- module stats balisage ;
- module absences (creation + validation) ;
- module infos ;
- shell applicatif responsive.

Avancee recente :

- persistance locale des demandes d'absences ;
- impact des absences approuvees dans le planning.

## 3. Perimetre MVP V1

### 3.1 MUST (obligatoire V1)

- consulter les modules metier sur mobile et desktop ;
- navigation rapide entre les modules ;
- planning lisible (filtres + statuts + edition rapide) ;
- consultation TG / plateau / balisage ;
- page informations equipe ;
- stabilite de l'interface (pas d'erreurs bloquantes).

### 3.2 SHOULD (important mais non bloquant)

- coherence des donnees de demonstration entre modules ;
- alertes visuelles sur sous-effectif ;
- message de derniere mise a jour par module.

### 3.3 OUT (hors V1)

- authentification complete en production ;
- workflow absences multi-role avec notifications ;
- audit terrain ;
- exports avancees ;
- synchronisation live avec source externe.

## 4. Ecrans MVP et criteres d'acceptation

### 4.1 Dashboard

Critere accepte si :

- les cartes modules ouvrent les bons ecrans ;
- les indicateurs ne cassent pas l'affichage mobile.

### 4.2 Planning

Critere accepte si :

- navigation mois precedent/suivant operationnelle ;
- filtre equipe (`Tous`, `Matin`, `Soir`, `Etudiants`) operationnel ;
- edition d'une cellule possible ;
- les absences approuvees se refletent dans les statuts du mois.

### 4.3 Plan TG

Critere accepte si :

- affichage des lignes metier lisible ;
- filtres principaux utilisables sans rechargement long.

### 4.4 Plan Plateau

Critere accepte si :

- consultation par periode possible ;
- recap operationnel mensuel lisible.

### 4.5 Stats balisage

Critere accepte si :

- synthese mensuelle visible ;
- progression lisible par code couleur ;
- tableau exploitable sur desktop et mobile.

### 4.6 Infos

Critere accepte si :

- bloc d'informations equipe consultable ;
- lecture claire sur mobile.

## 5. Regles metier MVP (version simplifiee)

- une absence creee est `EN_ATTENTE` ;
- seule une absence `APPROUVE` impacte le planning ;
- mapping planning :
  - `CP -> CP`
  - `MAL -> MAL`
  - `CONGE_MAT -> CONGE_MAT`
  - `FORM -> FORM`
  - `AUTRE` ou `FERIE -> ABS`
- une edition manuelle de cellule planning reste prioritaire sur le calcul automatique.

## 6. Donnees et persistance MVP

- donnees modules : fichiers TypeScript statiques ;
- absences : persistance locale navigateur (`localStorage`) ;
- pas encore de base de donnees serveur.

Consequence :

- comportement stable pour les tests fonctionnels locaux ;
- non adapte (encore) a un usage multi-poste/multi-utilisateur.

## 7. Definition de done V1

La V1 sera consideree terminee quand les 4 points suivants seront valides :

1. validation terrain sur smartphone + desktop ;
2. correction des anomalies bloquantes ;
3. gel fonctionnel V1 ;
4. mise en ligne de la version stable.

## 8. Reste a faire V1 (priorise)

P0 :

- campagne de validation terrain avec scenarios reels ;
- corrections issues des retours terrain.

P1 :

- harmonisation finale des jeux de donnees ;
- micro-ajustements UX mobile.

P2 :

- preparation du passage V2 (workflow absences complet cote manager).

## 9. Prochaine etape immediate

Prochaine etape recommande :

- lancer la validation terrain V1 avec une checklist de tests par module ;
- ouvrir les tickets de correction ;
- figer une release candidate `v0.2.x` avant mise en ligne.
