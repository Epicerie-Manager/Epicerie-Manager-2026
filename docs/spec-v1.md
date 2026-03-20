# Specification V1

Ce document decrit la premiere vraie version utile de l'application.

La `V1` doit remplacer le Google Site pour les usages principaux du quotidien, sans chercher a tout faire d'un coup.

## 1. But de la V1

Le but de la `V1` est de fournir une application web simple, claire et pratique qui permet a la manager et a l'equipe de consulter facilement les informations essentielles.

La `V1` doit etre :

- lisible sur smartphone ;
- pratique sur tablette ;
- utilisable sur ordinateur ;
- plus claire que le Google Site ;
- plus simple a faire evoluer.

## 2. Ce que la V1 doit absolument faire

La `V1` doit permettre :

- de se connecter a l'application ;
- d'arriver sur une page d'accueil claire ;
- de consulter le planning ;
- de consulter les plans TG / GB ;
- de consulter les plans plateau ;
- de consulter les stats de balisage ;
- d'acceder rapidement aux informations utiles.

## 3. Ce que la V1 ne fait pas encore

La `V1` ne gere pas encore :

- les demandes d'absence completes ;
- les validations manager d'absence ;
- le formulaire d'audit terrain ;
- les comptes-rendus automatiques ;
- les notifications avancees ;
- les exports complexes.

Ces elements seront traites en `V2` ou `V3`.

## 4. Utilisateurs de la V1

### 4.1 Collaborateur

Le collaborateur doit pouvoir :

- se connecter ;
- voir son planning ;
- voir les informations du jour ou de la semaine ;
- consulter les plans utiles a son travail ;
- voir les stats qui lui sont destinees.

### 4.2 Manager

La manager doit pouvoir :

- voir le planning de l'equipe ;
- consulter les plans TG ;
- consulter les plans plateau ;
- consulter les stats de balisage ;
- avoir une vision plus globale que celle d'un collaborateur.

## 5. Ecrans de la V1

### 5.1 Ecran de connexion

But :

Permettre l'acces securise a l'application.

Contenu :

- identifiant ;
- mot de passe ;
- bouton de connexion.

### 5.2 Ecran d'accueil

But :

Servir de point d'entree simple vers les modules.

Contenu :

- message de bienvenue ;
- acces rapide au planning ;
- acces rapide au plan TG ;
- acces rapide au plan plateau ;
- acces rapide aux stats de balisage ;
- eventuellement un bloc "informations utiles".

### 5.3 Ecran Planning

But :

Permettre de consulter rapidement les horaires et informations de planning.

Contenu minimum :

- vue du planning ;
- filtre par mois ;
- filtre par collaborateur pour la manager ;
- mise en avant du jour courant ;
- lecture facile sur mobile.

Informations a afficher :

- jour ;
- date ;
- horaires ;
- statuts type `RH`, `CP`, `X`, `FERIE` ;
- eventuellement vue binomes de repos ;
- eventuellement vue tri caddie si faisable dans la V1 sans trop compliquer.

### 5.4 Ecran Plan TG / GB

But :

Permettre de retrouver les implantations et responsabilites terrain.

Contenu minimum :

- filtre par semaine ;
- filtre par responsable ;
- filtre TG / GB ;
- liste claire des lignes a executer.

Informations a afficher :

- semaine ;
- rayon ;
- famille ;
- type ;
- responsable ;
- produit ;
- quantite ;
- mecanique commerciale.

### 5.5 Ecran Plan Plateau

But :

Permettre de consulter les plans plateau simplement.

Contenu minimum :

- acces par mois ;
- acces par semaine ;
- affichage du document de facon lisible ;
- solution correcte sur mobile.

Pour la V1, on peut rester sur une consultation du PDF si c'est le plus rapide et le plus fiable.

### 5.6 Ecran Stats balisage

But :

Permettre de consulter rapidement le niveau de suivi balisage.

Contenu minimum :

- vue par mois ;
- vue par employe ;
- indicateurs clairs ;
- codes couleur simples.

Informations a afficher :

- total controles ;
- pourcentage d'avancement ;
- taux d'erreur ;
- statut.

### 5.7 Ecran Informations

But :

Avoir une page simple pour les informations d'equipe utiles.

Contenu :

- consignes ;
- rappels ;
- liens utiles ;
- informations ponctuelles.

## 6. Donnees de la V1

La `V1` s'appuiera d'abord sur les sources existantes.

Sources identifiees :

- fichier planning ;
- fichier plan TG ;
- fichier suivi balisage ;
- PDF plans plateau ;
- eventuellement certaines sources Google publiees si utile.

Approche recommandee pour la V1 :

- lire ou importer les donnees existantes ;
- ne pas demander tout de suite a l'equipe de changer sa facon de preparer les donnees ;
- fiabiliser l'affichage avant de refondre les workflows.

## 7. Priorites de developpement dans la V1

Ordre recommande :

1. connexion et structure generale ;
2. accueil ;
3. planning ;
4. plan TG ;
5. plan plateau ;
6. stats balisage ;
7. ajustements d'ergonomie ;
8. validation terrain.

## 8. Definition de succes de la V1

On pourra considerer que la `V1` est reussie si :

- la manager peut se servir de l'application a la place du Google Site pour l'essentiel ;
- les collaborateurs trouvent facilement leur planning et les informations utiles ;
- la consultation sur telephone est simple ;
- les modules principaux sont stables ;
- l'application est assez propre pour servir de base a la `V2`.

## 9. Questions qui restent a valider

Les points suivants devront etre arbitres au fur et a mesure :

- faut-il afficher tous les collaborateurs ou seulement le sien pour chaque utilisateur ;
- quelles stats sont visibles par toute l'equipe ;
- faut-il integrer les binomes et tri caddie des la V1 ou juste apres ;
- quel niveau de detail garder sur mobile ;
- faut-il une page informations des la V1 ou plus tard.

## 10. Prochaine etape apres validation de ce document

Une fois cette `V1` validee, la suite logique sera :

- choisir la stack technique finale ;
- creer l'ossature du projet ;
- commencer par le module `Planning`.
