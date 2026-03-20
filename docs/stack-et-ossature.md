# Stack et ossature du projet

Ce document explique de facon simple :

- la stack recommandee pour l'application ;
- ce que cela veut dire concretement ;
- ce qu'on appelle l'ossature du projet.

## 1. C'est quoi la stack

La `stack`, c'est l'ensemble des outils techniques utilises pour construire l'application.

On peut la voir comme la boite a outils du projet.

Elle sert a definir :

- avec quoi on construit les pages ;
- avec quoi on gere les donnees ;
- avec quoi on gere les utilisateurs ;
- avec quoi on hebergera l'application plus tard.

## 2. Stack recommandee

Je recommande :

- `Next.js`
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `authentification simple`

## 3. Explication simple de chaque brique

### Next.js

C'est l'outil principal pour construire l'application web.

Il servira a faire :

- les pages ;
- le menu ;
- les ecrans ;
- la navigation ;
- une partie de la logique de l'application.

En pratique, c'est le coeur visible de l'application.

### TypeScript

C'est une facon plus securisee d'ecrire le code.

Pour toi, ce qu'il faut retenir, c'est surtout :

- moins d'erreurs stupides ;
- un projet plus propre ;
- un code plus facile a maintenir.

### PostgreSQL

C'est la base de donnees.

Elle servira a stocker proprement :

- les utilisateurs ;
- les plannings ;
- les absences ;
- les plans TG ;
- les stats ;
- les audits plus tard.

En gros, c'est la memoire propre de l'application.

### Prisma

C'est l'outil qui fait le lien entre l'application et la base de donnees.

Il permet de :

- creer la structure des donnees ;
- lire les donnees ;
- ajouter ou modifier des donnees ;
- garder quelque chose de propre et organise.

### Authentification

C'est la gestion des comptes et de la connexion.

Elle servira a savoir :

- qui est connecte ;
- si c'est un collaborateur ou une manager ;
- quelles informations chacun a le droit de voir.

## 4. Pourquoi cette stack est adaptee a ton projet

Cette stack est bien adaptee parce que :

- l'application doit fonctionner sur telephone et ordinateur ;
- il y aura plusieurs ecrans et plusieurs modules ;
- il faut pouvoir faire evoluer le projet dans le temps ;
- il faut une vraie base de donnees ;
- il faut separer proprement les roles et les acces.

Ce n'est pas une stack "de luxe" ou compliquee pour rien.

C'est une base moderne, solide et evolutive.

## 5. Ce qu'on appelle l'ossature du projet

L'ossature du projet, c'est le squelette de depart de l'application.

Avant de remplir les modules, il faut preparer :

- la structure generale ;
- les dossiers ;
- les pages principales ;
- la navigation ;
- la connexion ;
- la base de donnees ;
- les composants de base.

En image :

- la stack = les outils et les materiaux ;
- l'ossature = le squelette du batiment.

## 6. Concretement, l'ossature contiendra quoi

### 6.1 Les pages principales

Au depart, on preparera des pages comme :

- `Accueil`
- `Planning`
- `Plan TG`
- `Plan Plateau`
- `Stats`
- `Connexion`

### 6.2 La navigation

Il faudra un menu simple pour aller d'un module a l'autre.

Par exemple :

- accueil ;
- planning ;
- plans TG ;
- plateaux ;
- stats ;
- profil ou deconnexion.

### 6.3 La base de donnees

Il faudra preparer les premieres tables utiles.

Par exemple :

- utilisateurs ;
- employes ;
- plannings ;
- lignes de planning ;
- plans TG ;
- stats balisage.

### 6.4 La connexion

Il faudra preparer :

- l'ecran de login ;
- la protection des pages ;
- la distinction entre manager et collaborateur.

### 6.5 Les composants communs

Il faudra aussi preparer des briques reutilisables :

- mise en page generale ;
- boutons ;
- tableaux ;
- filtres ;
- cartes d'information ;
- messages d'erreur ou de chargement.

## 7. Ordre logique de construction

L'ordre recommande est :

1. creer l'ossature technique ;
2. mettre en place la connexion ;
3. preparer la navigation ;
4. brancher la base de donnees ;
5. construire le module planning ;
6. construire les autres modules.

## 8. Ce que cela change pour le projet

Avec cette approche :

- on arrete de dependre d'un Google Site bricole ;
- on construit une base solide ;
- on peut ajouter de nouvelles fonctions plus facilement ;
- on garde une logique claire pour V1, V2 et V3.

## 9. Decision recommandee

Je recommande de valider cette stack et cette approche d'ossature, puis de passer a l'etape suivante :

- creation du vrai projet technique ;
- mise en place de la structure de base ;
- lancement du module `Planning` en premier.
