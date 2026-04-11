# Audit global `Epicerie Manager 2026`

Date : 4 avril 2026  
Périmètre :
- dashboard manager bureau
- application manager mobile
- application collaborateur mobile
- architecture Vercel
- architecture Supabase

Objectif de cette note :
- donner un état clair du projet
- lister ce qui est déjà bien construit
- identifier ce qui doit être revérifié
- proposer les chantiers prioritaires
- fournir un support exploitable par Claude pour un second audit

## 1. Résumé rapide

Le projet a beaucoup mûri et la base fonctionnelle est déjà sérieuse.

Points forts actuels :
- le parcours manager mobile est devenu cohérent et exploitable
- le module `Mètre à mètre` est relié à Supabase et ne repose plus sur un simple HTML isolé
- le suivi collaborateur est devenu un vrai module transverse
- la séparation entre bureau, manager mobile et collaborateur a beaucoup progressé
- le calcul des absences hors dimanche est corrigé
- le projet manager dédié sur Vercel a permis de stabiliser une partie du comportement mobile

Points de vigilance principaux :
- l’architecture reste très client-side et très “store/event bus”
- plusieurs couches métier contiennent encore des données de secours ou des règles codées en dur
- l’auth collaborateur contient encore une logique fragile avec mapping embarqué dans le code
- l’auth manager mobile dépend d’un flux PIN custom à surveiller de près
- l’ensemble Vercel/Supabase fonctionne, mais il faut formaliser les dépendances de déploiement et de variables d’environnement

Conclusion courte :
- le produit est déjà utile
- la prochaine phase n’est pas tant “rajouter plein de fonctionnalités” que “sécuriser, simplifier et fiabiliser”

## 2. Cartographie actuelle

### 2.1 Fronts / entrées

- bureau manager :
  - URL live principale
  - dashboard complet
  - modules bureau historiques

- manager mobile :
  - projet Vercel séparé
  - accès PIN manager
  - navigation mobile dédiée
  - PWA volontairement désactivée sur cette variante pour éviter les collisions

- collaborateur mobile :
  - flux collaborateur dédié dans le projet principal
  - accès PIN / mot de passe selon le flux actuel

### 2.2 Base de données / Supabase

Tables et briques importantes identifiées :
- `employees`
- `absences`
- `profiles`
- `planning_entries`
- `plans_tg_entries`
- `balisage_mensuel`
- `employee_followups`
- `employee_followup_sections`
- `employee_followup_items`
- `manager_mobile_access`
- fonction SQL `verify_manager_mobile_pin(...)`

### 2.3 Déploiement

Montage actuel probable :
- projet Vercel principal pour bureau + collaborateur
- projet Vercel dédié `manager-epicerie` pour l’application manager mobile
- comportement du projet manager piloté par la variable :
  - `NEXT_PUBLIC_APP_VARIANT=manager`

## 3. Ce qui est bien aujourd’hui

### 3.1 Produit / UX

- la logique métier du terrain est bien retranscrite
- la version mobile manager commence à être réellement utilisable
- l’écran d’accueil manager est devenu lisible et compact
- le planning manager a une vraie valeur opérationnelle
- la gestion des absences sur mobile a pris une bonne direction
- le suivi collaborateur ne ressemble plus à une simple page technique

### 3.2 Données

- les audits `Mètre à mètre` sont correctement structurés
- la restitution historique des audits existe
- les rayons du module terrain sont alimentés depuis les données réelles
- les absences sont bien recalculées hors dimanche
- une bonne partie des modules relisent désormais Supabase comme source de vérité

### 3.3 Découpage fonctionnel

- `manager mobile` et `bureau` sont désormais pensés différemment
- `suivi collaborateur` sert de colonne vertébrale transverse
- le flux de création / lecture / suppression d’un audit existe
- l’app collaborateur bénéficie d’une expérience plus propre qu’au début

## 4. Ce qui doit être revérifié rapidement

### 4.1 Authentification collaborateur

Fichier concerné :
- [D:\Epicerie Manager 2026\src\lib\collab-auth.ts](D:\Epicerie%20Manager%202026\src\lib\collab-auth.ts)

Constat :
- la logique collaborateur contient encore un `COLLAB_PROFILE_MAPPING` codé en dur
- cette table embarque des `auth_id`, `employee_id` et emails calculés
- il y a aussi une convention email artificielle du type `nom@ep.fr`

Pourquoi c’est à revérifier :
- fort risque de dérive si un collaborateur change, quitte ou est ajouté
- logique d’identité exposée côté front
- dette technique importante si le volume ou les profils bougent

Recommandation :
- déplacer ce mapping vers Supabase
- idéalement dans `profiles` ou une table dédiée de correspondance
- faire disparaître le mapping embarqué côté client

### 4.2 Authentification manager mobile

Fichiers concernés :
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\login\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\login\route.ts)
- [D:\Epicerie Manager 2026\src\app\api\manager-mobile\profiles\route.ts](D:\Epicerie%20Manager%202026\src\app\api\manager-mobile\profiles\route.ts)
- [D:\Epicerie Manager 2026\src\lib\manager-mobile-auth.ts](D:\Epicerie%20Manager%202026\src\lib\manager-mobile-auth.ts)
- [D:\Epicerie Manager 2026\src\lib\supabase-admin.ts](D:\Epicerie%20Manager%202026\src\lib\supabase-admin.ts)

Constat :
- le flux PIN manager repose sur une table custom `manager_mobile_access`
- la vérification du PIN est faite par RPC SQL
- ensuite un `magiclink` est généré côté admin Supabase

Pourquoi c’est à revérifier :
- c’est plus complexe qu’un login standard
- dépendant de `SUPABASE_SERVICE_ROLE_KEY`
- dépendant de SQL custom et de variables d’environnement bien configurées
- dépendant d’une cohérence forte entre bureau / manager / Supabase auth

Recommandation :
- garder ce flux, mais le documenter formellement
- tester les cas :
  - PIN faux
  - manager désactivé
  - compte manager supprimé
  - perte de variable `SUPABASE_SERVICE_ROLE_KEY`
  - changement de PIN

### 4.3 Projet Vercel manager

Constat :
- le projet manager séparé était la bonne décision
- mais il reste plus fragile qu’un projet totalement indépendant fonctionnellement

Pourquoi c’est à revérifier :
- dépend d’un `variant` d’application
- dépend de variables d’environnement propres
- la moindre dérive entre projet principal et projet manager peut créer des bugs subtils

Recommandation :
- maintenir une checklist de variables d’environnement
- vérifier à chaque déploiement manager :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_VARIANT=manager`

### 4.4 Stores front très riches

Fichiers concernés notamment :
- [D:\Epicerie Manager 2026\src\lib\planning-store.ts](D:\Epicerie%20Manager%202026\src\lib\planning-store.ts)
- [D:\Epicerie Manager 2026\src\lib\rh-store.ts](D:\Epicerie%20Manager%202026\src\lib\rh-store.ts)
- [D:\Epicerie Manager 2026\src\lib\infos-store.ts](D:\Epicerie%20Manager%202026\src\lib\infos-store.ts)
- [D:\Epicerie Manager 2026\src\lib\absences-store.ts](D:\Epicerie%20Manager%202026\src\lib\absences-store.ts)

Constat :
- beaucoup de logique métier vit dans des stores client
- plusieurs modules utilisent des snapshots en mémoire + events navigateur
- certains stores contiennent encore des seed/fallbacks importants

Pourquoi c’est à revérifier :
- plus la logique grossit, plus le débogage devient coûteux
- risque de divergence entre seed locale et base réelle
- rend la frontière “source de vérité” moins nette

Recommandation :
- clarifier store par store :
  - ce qui vient vraiment de Supabase
  - ce qui n’est qu’un fallback de dev
  - ce qui devrait être migré en serveur/API

## 5. Ce qui devrait être modifié à court ou moyen terme

### 5.1 Priorité haute

#### A. Supprimer le mapping collaborateur hardcodé

Pourquoi :
- c’est le point le plus fragile côté identité

Action recommandée :
- créer une vraie relation stable `auth user -> profile -> employee`
- faire sauter la table de mapping embarquée dans le front

#### B. Réduire la dépendance aux seed data dans les stores

Pourquoi :
- utile pour démarrer, mais dangereux si ça reste longtemps

Action recommandée :
- déplacer les defaults vers :
  - SQL de seed
  - ou tables de configuration
  - ou scripts d’initialisation

#### C. Documenter formellement le setup des deux projets Vercel

Pourquoi :
- aujourd’hui, beaucoup d’éléments sont connus implicitement

Action recommandée :
- créer une doc interne simple :
  - quel projet sert quoi
  - quelles variables sont obligatoires
  - quelles URLs sont attendues
  - quels tests faire après déploiement

### 5.2 Priorité moyenne

#### D. Clarifier les règles d’éligibilité métier

Exemple :
- exclusion codée en dur de certains noms dans le suivi

Fichier à revoir :
- [D:\Epicerie Manager 2026\src\lib\followup-store.ts](D:\Epicerie%20Manager%202026\src\lib\followup-store.ts)

Pourquoi :
- les exclusions / inclusions devraient vivre dans les données RH, pas dans le code

#### E. Nettoyer les routes et reliquats devenus inutiles

Exemple :
- la route manager PIN paramétrée historique est aujourd’hui surtout un reliquat

Pourquoi :
- moins de chemins morts = moins de confusion pour le futur

#### F. Revoir la place réelle de NextAuth

Fichier :
- [D:\Epicerie Manager 2026\src\lib\auth.ts](D:\Epicerie%20Manager%202026\src\lib\auth.ts)

Pourquoi :
- `next-auth` est présent alors que l’auth réelle semble largement pilotée par Supabase custom
- il faut décider :
  - soit on l’assume et on l’utilise vraiment
  - soit on l’enlève à terme

## 6. Analyse spécifique par surface

### 6.1 Dashboard bureau

Forces :
- riche fonctionnellement
- vision opérationnelle large
- modules nombreux

Points à surveiller :
- page très client-side
- nombreuses synchronisations parallèles
- usage important d’events navigateur
- risque de couplage fort entre modules

Recommandation :
- à moyen terme, isoler davantage par domaine :
  - planning
  - absences
  - balisage
  - RH
  - suivi

### 6.2 Application manager mobile

Forces :
- vraie expérience mobile
- parcours terrain utilisable
- planning mobile convaincant
- gestion des absences manager utile
- accueil manager propre et lisible

Points à surveiller :
- dépendance à un projet Vercel dédié
- auth PIN custom
- risque de divergence entre bureau et mobile si les règles métier évoluent en double

Recommandation :
- considérer l’app manager comme un produit à part entière
- documenter son contrat de données et son contrat d’auth

### 6.3 Application collaborateur

Forces :
- utile
- lisible
- maintenant enrichie de la dernière actualisation

Points à surveiller :
- auth collaborateur encore trop dépendante du code embarqué
- structure potentiellement fragile si l’équipe change souvent

Recommandation :
- refondre la liaison identité collaborateur / employee dans Supabase

## 7. Analyse Vercel

### Ce qui est bien

- le split manager sur un projet dédié a aidé à sortir des collisions bureau/mobile
- la résolution du problème PWA/manifest sur manager était pertinente
- la prod semble désormais plus stable côté manager mobile

### Ce qu’il faut revérifier

- cohérence des env vars entre projets
- redéploiement manager après chaque changement lié auth/navigation
- vérification des liens finaux publics
- documentation des flows post-deploy

### Recommandations

- créer une doc `DEPLOYMENT.md` ou `docs/vercel-setup.md`
- inclure :
  - nom des projets
  - env vars requises
  - URLs live
  - procédure de redeploy
  - checklist de test après mise en ligne

## 8. Analyse Supabase

### Ce qui est bien

- vraie structuration des audits terrain
- fonction SQL dédiée pour manager PIN
- usage de la base comme source de vérité de plus en plus net

### Ce qu’il faut revérifier

- RLS effectives sur toutes les tables sensibles
- exposition réelle des données via client anon
- cohérence entre `profiles`, `employees`, `absences`, `manager_mobile_access`
- robustesse des fonctions SQL custom et des patches appliqués

### Recommandations

- auditer les policies RLS table par table
- documenter les patches SQL indispensables :
  - [D:\Epicerie Manager 2026\docs\sql\2026-04-03-metre-a-metre-followup-schema.sql](D:\Epicerie%20Manager%202026\docs\sql\2026-04-03-metre-a-metre-followup-schema.sql)
  - [D:\Epicerie Manager 2026\docs\sql\2026-04-04-manager-mobile-pin-access.sql](D:\Epicerie%20Manager%202026\docs\sql\2026-04-04-manager-mobile-pin-access.sql)
- prévoir une stratégie propre de seed / migration / environnement

## 9. Dette technique repérée

Dette technique forte :
- mapping collaborateur hardcodé dans le front
- stores très riches avec logique métier et fallback mélangés
- traces d’anciennes stratégies d’auth / routing / PWA

Dette technique moyenne :
- quelques règles métier encore codées en dur
- pages très volumineuses côté client
- couplage assez fort entre UI et logique métier dans certains écrans

Dette technique faible :
- quelques reliquats de routes / flux antérieurs à nettoyer
- besoin de documentation d’exploitation

## 10. Recommandation de priorité

Ordre recommandé :

1. Sécuriser et simplifier l’auth collaborateur
2. Documenter proprement les projets Vercel et leurs env vars
3. Auditer les RLS Supabase
4. Réduire les données de secours codées en dur
5. Nettoyer les reliquats techniques
6. Ensuite seulement, continuer l’ajout de fonctionnalités

## 11. Ce que Claude devrait particulièrement challenger

Je conseille à Claude de relire en priorité :

### Architecture
- le découpage entre bureau / manager mobile / collaborateur
- la pertinence du split Vercel actuel
- l’usage massif de stores client

### Authentification
- la sécurité et la maintenabilité du flux manager PIN
- la faiblesse du mapping collaborateur hardcodé
- la cohabitation éventuelle NextAuth / Supabase custom

### Données
- la cohérence entre `profiles`, `employees`, `absences`, `manager_mobile_access`
- la qualité des policies RLS
- la stratégie de migrations SQL

### Produit
- les points de friction restants dans le manager mobile
- ce qui devrait être stabilisé avant d’ajouter de nouveaux gros modules

## 12. Question directe à poser à Claude

Tu peux lui envoyer cette consigne :

> Fais un audit technique et produit de ce projet Next.js/Supabase/Vercel.  
> Analyse séparément :
> 1. le dashboard bureau manager  
> 2. l’application manager mobile  
> 3. l’application collaborateur  
> 4. l’architecture Vercel  
> 5. l’architecture Supabase  
>  
> J’attends :
> - ce qui est bien
> - les points à revérifier
> - les risques techniques / sécurité / maintenance
> - les refactors prioritaires
> - les modifications à faire en premier
>  
> Merci de challenger particulièrement :
> - le flux d’auth manager PIN
> - le mapping collaborateur hardcodé dans le front
> - la dette technique liée aux stores client et aux fallbacks de seed
> - la robustesse du déploiement Vercel avec un projet manager séparé

## 13. Verdict global

Verdict honnête :

- le projet est déjà fort sur le plan métier
- il a maintenant une vraie cohérence produit
- il commence à ressembler à un outil réellement exploitable
- mais techniquement il est encore dans une phase “accélération / consolidation”

En d’autres termes :
- le plus dur côté produit est largement enclenché
- le plus important maintenant est de transformer les bons résultats actuels en base stable et durable
