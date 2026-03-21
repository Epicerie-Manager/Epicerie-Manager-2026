# Feuille de route du projet

Ce document sert de fil rouge pour suivre l'avancement du projet.

L'idee est simple :

- `V1` = remplacer le Google Site par une application utile au quotidien ;
- `V2` = ajouter la gestion des demandes et du suivi manager ;
- `V3` = ajouter les fonctions evoluees de pilotage terrain.

## Vision simple

### V1 - Consulter facilement

Objectif :

Mettre a disposition une vraie application web simple, claire et utilisable sur telephone, tablette et ordinateur.

### V2 - Gerer les demandes

Objectif :

Ajouter la partie gestion, en particulier autour des absences.

### V3 - Piloter le terrain

Objectif :

Transformer l'application en outil de pilotage terrain.

## Vision globale

```mermaid
flowchart LR
    A["V1<br/>Consulter"] --> B["V2<br/>Gerer"]
    B --> C["V3<br/>Piloter"]
```

## Tableau de suivi (etat au 21 mars 2026)

### V1

| Etape | Description | Statut |
|---|---|---|
| Cadrage | Comprendre l'existant et definir le perimetre | Fait |
| Specification MVP | Definir clairement ce qu'on met dans la V1 | En cours |
| Structure technique | Creer la base du projet | Fait |
| Module Planning | Afficher le planning | Fait |
| Module TG | Afficher les plans TG / GB | Fait |
| Module Plateau | Afficher les plans plateau | Fait |
| Module Stats | Afficher les controles balisage | Fait |
| Validation terrain | Verifier avec les vrais usages | A faire |
| Mise en ligne | Rendre l'application utilisable | A faire |

### V2

| Etape | Description | Statut |
|---|---|---|
| Cadrage absences | Definir les regles de demande et validation | En cours |
| Formulaire absence | Saisie collaborateur | En cours |
| Suivi manager | Validation / refus | En cours |
| Historique | Voir les demandes passees | A faire |
| Integration planning | Repercuter les absences | En cours |

### V3

| Etape | Description | Statut |
|---|---|---|
| Cadrage audit | Definir la grille de visite | A faire |
| Formulaire audit | Saisie terrain | A faire |
| Compte-rendu | Generer le rapport | A faire |
| Envoi collaborateur | Diffuser le resultat | A faire |
| Suivi des actions | Historique et relances | A faire |

## Outil de suivi recommande

Pour rester simple, on continue avec `GitHub Projects`.

Structure conseillee :

- colonne `Idees`
- colonne `A faire`
- colonne `En cours`
- colonne `En test`
- colonne `Valide`

Types de cartes a suivre en priorite immediate :

- `Spec V1 (validation finale)`
- `Validation terrain V1`
- `Corrections V1`
- `Mise en ligne V1`
- `V2 Absences - Historique`

## Regle simple de pilotage

- on termine la validation V1 avant de basculer en V2 complet ;
- on evite d'ajouter du scope V3 tant que V1 n'est pas stabilisee ;
- chaque ticket doit avoir un critere d'acceptation testable.

## Prochaine etape

La prochaine etape logique est :

- finaliser la specification MVP (`docs/spec-v1.md`) ;
- executer une validation terrain courte (checklist) ;
- corriger puis preparer la mise en ligne.
