# Cadrage de transformation du Google Site en application web

## 1. Contexte

Le Google Site actuel sert de portail mobile et desktop pour l'equipe epicerie de Villebon 2.
Il agrege aujourd'hui plusieurs sources Google Sheets / Excel / PDF pour exposer :

- le planning des collaborateurs ;
- les plans TG / GB par semaine ;
- les plans plateau ;
- les controles balisage et certaines statistiques ;
- une entree "demande d'absence" ;
- une page d'informations.

Le besoin n'est pas seulement de "refaire un site", mais de construire une vraie application web metier, plus fiable, plus simple a maintenir, et capable d'evoluer vers de nouveaux usages comme l'audit terrain.

## 2. Existant confirme

### 2.1 Pages visibles sur le Google Site

Pages detectees sur le site public :

- `Accueil`
- `Planning`
- `Plan TG Epicerie`
- `Plan Plateau`
- `Controle balisage`
- `Demande d'absence`
- `Informations`

### 2.2 Comportement technique actuel

Le site actuel contient deja de la logique applicative cote navigateur :

- `Planning` charge des CSV publies depuis Google Sheets et reconstruit des vues optimisees mobile.
- `Planning` genere notamment une vue planning employe, une vue binomes de repos, et une vue tri caddie.
- `Plan TG Epicerie` consomme un endpoint Google Apps Script.
- `Controle balisage` consomme aussi un endpoint Google Apps Script.
- `Plan Plateau` s'appuie sur un PDF Drive integre.

Conclusion : l'existant est deja un prototype d'application metier, mais disperse entre plusieurs services Google, du JavaScript embarque, des feuilles complexes et un PDF.

## 3. Sources de donnees identifiees

### 3.1 Planning

Source :

- `G:\Téléchargement G\drive-download-20260320T145421Z-3-001\Planning Epicerie 2026.xlsx`

Feuilles structurelles observees :

- `Liens publication`
- `SOMMAIRE_2026`
- `EXCEPTIONS`
- `EMPLOYES`
- `CYCLE_REPOS`
- `VUE_MANAGER`
- `JANVIER 2026` a `DECEMBRE 2026`
- `ADMIN`

Informations metier detectees :

- liste des employes ;
- type de poste / equipe ;
- horaires standard, mardi, samedi ;
- observations ;
- binomes de repos ;
- cycle de repos par semaine `S1` a `S5` ;
- exceptions / absences avec dates de debut et fin ;
- vue manager par jour avec present / absent / statut ;
- planning detaille par employe et par jour.

Formats visibles dans les cellules :

- horaires du type `3h50-11h20`, `14h-21h30` ;
- codes d'absence ou statut `RH`, `CP`, `X`, `FERIE` ;
- observation longue type `Conge maternite`.

### 3.2 Plan TG / GB

Source :

- `G:\Téléchargement G\drive-download-20260320T145421Z-3-001\PLAN TG EPICERIE 2026.xlsx`

Feuilles structurelles observees :

- `DATA_TG`
- `RAYONS_REF`
- `EMPLOYES`
- `AFFECTATIONS`
- `SEMAINES`
- `CONFIG_MAP`
- une feuille hebdomadaire par semaine

Informations metier detectees :

- semaine ;
- rayon ;
- famille ;
- type `TG` ou `GB` ;
- responsable ;
- produit ;
- quantite ;
- mecanique commerciale ;
- ordre des rayons ;
- liste des employes actifs ;
- affectation d'un employe a plusieurs rayons ;
- correspondance entre semaine et feuille source.

Le fichier contient assez d'information pour produire une vraie base "operations terrain" par semaine.

### 3.3 Controle balisage / stats

Source :

- `G:\Téléchargement G\drive-download-20260320T145421Z-3-001\Suivi contrôle balisage - épicerie 2026.xlsx`

Feuilles structurelles observees :

- `PARAMETRES`
- `DASHBOARD_MOIS`
- `JANV_2026` a `DEC_2026`

Informations metier detectees :

- objectif mensuel ;
- mois courant ;
- total controles par employe ;
- pourcentage d'avancement ;
- taux d'erreur ;
- statut visuel `OK`, `EN RETARD`, `ALERTE`.

### 3.4 Plans plateau

Source :

- `G:\Téléchargement G\RECAP PLATEAU A , B, C.pdf`

Contenu confirme :

- 21 pages ;
- organisation par mois et par semaine ;
- plan plateau avec zones / plateaux `A`, `B`, `C`, `D`.

## 4. Utilisateurs et roles

### 4.1 Manager

Le manager a besoin de :

- preparer et publier les plannings ;
- suivre les absences ;
- suivre les stats de balisage ;
- consulter et diffuser les plans TG / plateaux ;
- realiser des audits terrain ;
- envoyer un compte-rendu a un ou plusieurs collaborateurs.

### 4.2 Collaborateur

Le collaborateur a besoin de :

- voir son planning rapidement sur mobile ;
- connaitre ses horaires du jour et de la semaine ;
- consulter ses binomes / tri caddie / informations utiles ;
- voir les plateaux et implantations a executer ;
- consulter ses stats ou celles visibles par l'equipe selon les droits ;
- faire une demande d'absence.

### 4.3 Administrateur applicatif

Role probablement tenu au debut par toi et/ou la manager :

- gerer les utilisateurs ;
- connecter / synchroniser les sources ;
- corriger les donnees de reference ;
- superviser les imports et erreurs.

## 5. Modules cibles de l'application

### 5.1 Module Planning

Fonctions cibles :

- vue personnelle "Mon planning" ;
- vue equipe / manager ;
- filtre par mois, semaine, employe ;
- mise en avant du jour courant ;
- affichage des codes d'absence et statuts ;
- vue binomes de repos ;
- vue tri caddie ;
- historique et date de derniere mise a jour.

### 5.2 Module Absences

Fonctions cibles :

- formulaire collaborateur ;
- workflow de validation manager ;
- statut des demandes `en attente`, `acceptee`, `refusee` ;
- impact automatique dans le planning ;
- historique des demandes.

### 5.3 Module Plan TG / GB

Fonctions cibles :

- filtrage par semaine ;
- filtrage par responsable ;
- filtrage TG / GB ;
- vue rayon ;
- vue collaborateur ;
- synthese quantitative par semaine ;
- archivage des semaines precedentes.

### 5.4 Module Plateaux

Fonctions cibles :

- consultation mobile du plan plateau hebdomadaire ;
- acces rapide par mois / semaine ;
- zoom ou vision simplifiee mobile ;
- possibilite a terme de remplacer le PDF par des donnees structurees.

### 5.5 Module Controle balisage / stats

Fonctions cibles :

- vue mensuelle equipe ;
- vue detaillee par collaborateur ;
- comparaison objectif / realise ;
- statut visuel clair ;
- historique par mois.

### 5.6 Module Audit terrain

Evolution demandee explicitement.

Fonctions cibles :

- formulaire d'audit avec champs predefinis ;
- pieces jointes ou photos en option ;
- observations factuelles ;
- score / statut / plan d'action ;
- generation automatique d'un compte-rendu ;
- envoi aux collaborateurs concernes ;
- suivi des audits dans le temps.

## 6. Modele de donnees cible

Premiere proposition d'entites :

- `users`
- `employees`
- `roles`
- `schedules`
- `schedule_days`
- `schedule_assignments`
- `absence_requests`
- `absence_types`
- `weekly_plans`
- `weekly_plan_items`
- `rays`
- `employee_ray_assignments`
- `balisage_monthly_stats`
- `audit_reports`
- `audit_report_items`
- `documents`

Relations importantes :

- un `employee` peut avoir plusieurs affectations rayon ;
- un `schedule` contient plusieurs jours ;
- un jour de planning contient plusieurs affectations employe ;
- une absence peut impacter plusieurs jours de planning ;
- un plan hebdomadaire contient plusieurs lignes TG / GB ;
- un audit contient plusieurs points de controle.

## 7. Strategie de migration recommandee

### 7.1 Principe

Ne pas essayer de tout remplacer d'un coup.

Approche recommandee :

1. construire une application qui lit d'abord les sources existantes ;
2. fiabiliser les vues et les droits ;
3. internaliser progressivement la saisie metier dans l'application ;
4. reduire ensuite la dependance aux feuilles et au PDF.

### 7.2 Phases

#### Phase 1 - MVP de consultation

Objectif :

- remplacer le Google Site par une application lisible sur telephone, tablette et PC.

Perimetre :

- authentification simple ;
- page accueil ;
- module planning ;
- module plan TG ;
- module plateaux ;
- module controle balisage ;
- import ou lecture des sources existantes.

#### Phase 2 - Workflow absences

Objectif :

- sortir des formulaires ou bricolages Google pour avoir un vrai suivi.

Perimetre :

- saisie de demande ;
- validation manager ;
- notifications ;
- integration planning.

#### Phase 3 - Audit terrain

Objectif :

- ajouter l'outil de visite terrain et les comptes-rendus.

Perimetre :

- formulaire d'audit ;
- historique ;
- export / envoi du rapport ;
- suivi des actions.

#### Phase 4 - Internalisation complete

Objectif :

- ne plus dependre des fichiers Excel / Google Sheets comme source primaire.

Perimetre :

- edition native dans l'application ;
- imports ponctuels seulement ;
- versionning et historisation.

## 8. Architecture technique recommandee

### 8.1 Stack proposee

Pour un projet pragmatique, maintenable, et rapide a mettre en place :

- frontend : `Next.js` avec TypeScript
- backend : routes API `Next.js` ou backend separe selon la complexite
- base de donnees : `PostgreSQL`
- ORM : `Prisma`
- authentification : `NextAuth` ou equivalent
- UI : composants web responsives orientes mobile-first
- stockage documents : dossier partage / cloud storage selon hebergement

Pourquoi cette direction :

- excellente ergonomie pour une application web responsive ;
- bon compromis entre vitesse de developpement et qualite ;
- possibilite de faire coexister ecrans, API, auth et imports dans un meme projet ;
- facile a faire evoluer vers des workflows et tableaux de bord.

### 8.2 Synchronisation des donnees

Deux options realistes :

- `Option A` : l'application continue de lire les exports Google / Excel au debut.
- `Option B` : les fichiers sont importes regulierement dans une base via scripts d'import.

Recommandation :

- demarrer avec `Option B` pour fiabiliser les donnees, historiser et eviter de parser le HTML du Google Site.

## 9. Risques et points d'attention

- certaines feuilles contiennent une logique implicite cachee dans la mise en forme ou les cellules ;
- certaines donnees ne sont pas encore normalisees ;
- le PDF plateau n'est pas ideal comme source metier si on veut filtrer ou rechercher ;
- la page `Demande d'absence` devra probablement etre reconstituee si le formulaire source n'est pas clairement recuperable ;
- les droits d'acces doivent etre definis des le debut pour eviter d'exposer trop d'informations.

## 10. Recommandations immediates

### 10.1 Ce qu'il faut faire en premier

- figer la liste des modules du MVP ;
- recenser les utilisateurs et leurs droits ;
- choisir si les fichiers Excel restent source officielle pendant la phase 1 ;
- decider si les absences entrent dans le MVP ou en phase 2.

### 10.2 MVP recommande

Perimetre MVP conseille :

- connexion utilisateur ;
- accueil ;
- planning collaborateur ;
- planning manager ;
- plan TG ;
- plan plateau ;
- stats balisage ;
- base de donnees avec scripts d'import depuis les fichiers actuels.

Je recommande de laisser l'audit terrain en phase 2 ou 3, car il introduit du nouveau fonctionnel et du workflow.

## 11. Prochain livrable a produire

Le prochain document utile est une specification plus concrete avec :

- les ecrans de l'application ;
- les parcours utilisateur ;
- les tables de base de donnees ;
- la liste des imports a developper ;
- le decoupage technique du MVP.
