# Changelog

Ce fichier suit les evolutions visibles et fonctionnelles du projet `Epicerie Manager 2026`.

## Regle de maintenance

- A chaque fin de session de travail, ajouter une entree dans ce fichier.
- Toute modification visible ou fonctionnelle livre dans l'application doit etre referencee ici.
- Si une version est bump dans `package.json`, la section correspondante doit etre renseignee dans ce changelog.
- Si une information plus ancienne n'est pas certaine, la marquer explicitement comme `a confirmer`.

## Format conseille

```md
## vX.Y.Z - YYYY-MM-DD

- changement visible 1
- changement fonctionnel 2
- correction notable 3
```

## Historique

## v0.6.10 - 2026-03-29

- Collaborateurs / Auth : correction du script `reset-collab-passwords.ts` pour l'execution ESM avec `@next/env`, afin de pouvoir lancer le reset admin des mots de passe collaborateurs directement depuis le depot.

## v0.6.9 - 2026-03-29

- Collaborateurs / Auth : ajout du script d'administration `scripts/reset-collab-passwords.ts` pour réinitialiser en masse les mots de passe des comptes `@ep.fr` via l'API Admin Supabase, en chargeant automatiquement `.env.local`.

## v0.6.8 - 2026-03-29

- Collaborateurs : ajout d'un badge de version visible dans l'espace `/collab`, pour repérer rapidement la version en cours de la PWA collaborateur pendant les tests et recettes.

## v0.6.7 - 2026-03-29

- Collaborateurs / PIN : ajout de logs explicites autour de la tentative `signInWithPassword`, avec affichage de l'email construit et des erreurs de connexion en console pour diagnostiquer plus facilement les échecs de connexion Supabase.

## v0.6.6 - 2026-03-29

- Collaborateurs : l'écran `/collab/login` affiche maintenant l'instruction `Entrez les premières lettres de votre prénom`, et le champ de recherche est configuré pour rester vide au chargement sans autoremplissage parasite du navigateur.

## v0.6.5 - 2026-03-29

- Documentation : enrichissement de `RETOUR_CODEX.md` avec un compte-rendu complet pour Claude AI sur le socle collaborateur, les correctifs deja livres et le point de blocage probable cote Supabase Auth / profils.

## v0.6.4 - 2026-03-29

- Build / Local : le script `npm run dev` passe en `next dev --webpack` pour éviter le conflit Next.js 16 entre Turbopack et la configuration webpack ajoutée par `next-pwa`, et permettre les tests locaux de l'espace collaborateur.

## v0.6.3 - 2026-03-29

- Collaborateurs : le shell manager ne s'applique plus aux routes `/collab/*`, ce qui évite la redirection parasite vers `/login` quand on ouvre `/collab/login` ou les autres écrans collaborateurs.

## v0.6.2 - 2026-03-29

- Build / Vercel : la page /collab/pin passe en wrapper serveur + composant client pour éviter l'erreur de prerender App Router liée aux paramètres de recherche au build.

## v0.6.1 - 2026-03-29

- Build / Vercel : le script de production passe en `next build --webpack` pour rester compatible avec `next-pwa`, et éviter l'échec du build Next.js 16 en Turbopack avec une configuration webpack.

## v0.6.0 - 2026-03-29

- Collaborateurs : création du socle PWA `/collab` avec les écrans `login`, `pin`, `change-pin`, `home`, `planning`, `absences`, `absences/new` et `more`, sans modifier les modules manager existants.
- Authentification : ajout des helpers dédiés collaborateurs, du contrôle middleware par rôle et du flux `first_login` distinct du flux manager.
- PWA : ajout du `manifest`, des icônes, de `next-pwa` et de la configuration Next nécessaire pour rendre l'espace collaborateur installable sur mobile.

## v0.5.61 - 2026-03-29

- Documentation : ajout de `RETOUR_CODEX.md` a la racine pour consigner les ecarts identifies entre le brief collaborateur Claude AI et l'etat reel du projet avant implementation.

## v0.5.60 - 2026-03-29

- Plateau : les annotations sont maintenant rattachées au contexte `semaine + plateau + opération`, ce qui évite qu'une note saisie sur une semaine se réaffiche à tort sur une autre période de la même opération.
- Supabase / Plateau : ajout d'un patch de migration pour faire évoluer la table `plateau_operation_notes` vers cette clé métier plus précise sans recréer la table.

## v0.5.59 - 2026-03-29

- Plateau : l'affichage du plan prend maintenant le meilleur visuel disponible sur la semaine courante, même si aucun `Plateau A` n'est actif ou si l'image a été rangée sous un autre plateau lors de l'import.
- Plateau : le retour sur des semaines déjà visitées garde un fallback stable entre `WEEK`, `A`, `B` et `C`, ce qui évite les zones vides alors qu'un plan existe bien pour la semaine.

## v0.5.58 - 2026-03-29

- Infos : la page se recale maintenant sur le store partagé après chaque ajout ou suppression, ce qui supprime les écarts entre l'état local de l'écran et le snapshot mémoire synchronisé avec Supabase.
- Plateau : les annotations sortent du composant en dur et passent par un store dédié prêt pour Supabase, avec un patch SQL ajouté pour rendre ces notes persistantes entre sessions.

## v0.5.57 - 2026-03-29

- Plateau : l'import PDF enregistre désormais les plans extraits dans Supabase (`plateau_assets` + bucket `plateau-plans`) au lieu de les perdre à la fermeture du navigateur.
- Plateau : les visuels déjà importés sont rechargés automatiquement au retour sur la page, avec remplacement propre des semaines réimportées et possibilité d'ajouter ou supprimer aussi une image unitaire persistée.

## v0.5.56 - 2026-03-29

- Dashboard / Plateau : la tuile `Plateau` reprend maintenant le `Focus semaine` du module `Plateau`, avec la même semaine courante, les mêmes opérations actives et le même découpage `Plateau A / B / C-D`.
- Plateau : les données de frise sont mutualisées dans une source commune pour éviter que le dashboard et le module `Plateau` racontent deux versions différentes des opérations en cours.

## v0.5.55 - 2026-03-29

- Dashboard : la tuile `Plateau` abandonne l'intitulé `Chantiers terrain` pour rester cohérente avec le nom du module.

## v0.5.54 - 2026-03-29

- Balisage : la vue équipe est désormais limitée aux collaborateurs RH suivis en balisage ; les coordinateurs comme `Abdou` et `Massimo` n'y apparaissent plus, même si la liste est générée depuis la RH.

## v0.5.53 - 2026-03-29

- Balisage : la vue équipe et les données locales de secours se reconstruisent maintenant à partir de la RH, avec tous les collaborateurs non étudiants de la fiche RH, y compris `Florian`, `Khanh` et `Dilaxshan`.
- Balisage : suppression des anciens écarts de nommage comme `HASSANE`, pour n'afficher que les noms canoniques RH comme `EL HASSANE` et éviter les doublons ou les absents fantômes.
- Balisage / Supabase : la synchronisation mensuelle initialise désormais chaque mois sur le roster RH courant avant de réinjecter les valeurs enregistrées, ce qui garde la table alignée même quand un collaborateur n'a encore aucun contrôle saisi.

## v0.5.52 - 2026-03-29

- Planning / build : correction d'un import dans la vue `Mois` pour relire `defaultRhEmployees` et `defaultRhCycles` depuis le store RH réel, ce qui rétablit le build de production Vercel.

## v0.5.51 - 2026-03-29

- RH / Planning / Absences : les jeux de données locaux de secours sont réalignés sur le roster actif Supabase, avec `Florian` à la place de l'ancien `Yassine` et les mêmes rôles, horaires et statuts RH que sur le site.
- RH / Planning : `Massimo` est confirmé `Coordinateur` partout dans les sources runtime locales, et les cycles de repos de `Kamar` et `Liyakath` sont corrigés pour correspondre à Supabase.
- Planning : les valeurs de repli du planning réutilisent désormais la base RH locale vérifiée, ce qui évite qu'un ancien statut ou un ancien employé réapparaisse si la synchro Supabase ne répond pas.

## v0.5.50 - 2026-03-29

- Planning vue `Mois` : `Massimo` est rétabli dans `Coordinateurs après-midi`, pour retrouver la structure attendue de l'équipe d'après-midi.
- Planning vue `Mois` : `Dilaxshan` reste dans `Collaborateurs après-midi` et la séparation `Coordinateur / Collaborateurs` de l'après-midi revient comme sur les versions précédentes.

## v0.5.49 - 2026-03-29

- Planning vue `Mois` : `Cécile` garde sa place dans `Collaborateurs matin`, mais son étiquette nom reçoit désormais une surbrillance bleu foncé dédiée pour la distinguer clairement du reste de l'équipe.
- Planning vue `Mois` : `Abdou` conserve sa surbrillance verte de coordinateur, afin de différencier visuellement les deux repères matin sans les confondre.

## v0.5.48 - 2026-03-29

- Planning vue `Mois` : Cécile repasse dans la section `Collaborateurs matin`, tout en conservant sa surbrillance verte de repère visuel comme Abdou.
- Planning vue `Mois` : la répartition reste confirmée avec `Abdou` en `Coordinateurs matin`, `Massimo` en `Coordinateurs après-midi`, `Dilaxshan` en `Collaborateurs après-midi` et les étudiants inchangés.

## v0.5.47 - 2026-03-29

- Planning vue `Mois` : la ligne `Effectif matin / après-midi` remonte en haut du tableau, juste sous les en-têtes de jours, pour être visible avant les groupes d'employés.
- Planning vue `Mois` : les sections sont renommées et clarifiées en `Coordinateurs matin`, `Collaborateurs matin`, `Coordinateurs après-midi` et `Collaborateurs après-midi`, avec le même principe de lecture pour les deux équipes.

## v0.5.46 - 2026-03-29

- Planning vue `Mois` : les KPI bases sur la journee actuelle sont retires au profit d'indicateurs mensuels plus utiles (`jours critiques`, `jours en alerte`, `demandes en attente`, `demandes a risque`).
- Planning : les demandes en attente affichees dans les KPI du mois sont maintenant filtrees sur le mois consulte, avec la meme logique de risque que le dashboard pour reperer les absences qui tombent sur des periodes fragiles.

## v0.5.45 - 2026-03-29

- Authentification : le délai de déconnexion automatique pour inactivité passe de 30 minutes à 1 heure.

## v0.5.44 - 2026-03-29

- Authentification : la session applicative n'est plus reprise automatiquement après fermeture complète du navigateur ; une réouverture demande maintenant une nouvelle connexion.
- Sécurité : ajout d'une déconnexion automatique après 30 minutes d'inactivité, partagée entre les onglets ouverts de l'application.
- Login / changement de mot de passe / shell principal : la session navigateur est maintenant revalidée à l'ouverture et nettoyée correctement lors d'une déconnexion manuelle ou automatique.

## v0.5.43 - 2026-03-29

- Nettoyage technique des stores `RH`, `Plan TG`, `Planning`, `Balisage` et `Infos` : les données de travail ne passent plus par un cache navigateur de session masqué, mais par des snapshots mémoire de module.
- Les anciennes clés `localStorage` legacy continuent d'être purgées au chargement, ce qui termine le chantier de retrait des anciens caches navigateur comme source de vérité métier.
- Le helper `browser-cache` ne sert plus qu'au ménage des anciennes clés legacy, afin d'éviter qu'un état stale survive entre modules ou réapparaisse après navigation.

## v0.5.42 - 2026-03-29

- Planning semaine : la section `Présents` distingue maintenant clairement `Matin` et `Après-midi` sur chaque carte jour, au lieu d'afficher une seule liste.
- La distinction est calculee a partir des horaires reels du jour, pour rester alignee avec les compteurs hebdomadaires et inclure correctement les profils d'apres-midi ou les etudiants selon leur creneau.

## v0.5.41 - 2026-03-29

- Seuils de présence : ajout d'une configuration partagée `matin / après-midi` avec persistance prévue via `Supabase`, un store frontend commun et un patch SQL dédié `supabase/patch_presence_thresholds.sql`.
- Absences : `Timeline & Suivi` calcule désormais les effectifs à partir des horaires réels, propose 4 seuils (`alerte / critique` matin et après-midi) et permet de les enregistrer pour les partager avec le dashboard et le planning.
- Dashboard : la carte `Vue mensuelle` devient navigable mois par mois, utilise les seuils partagés et recalcule `jours alerte`, `jours critiques`, `demandes à risque` et `plus faible matin` sur le mois sélectionné.
- Planning : les alertes et les effectifs du mois, de la semaine et du jour utilisent maintenant la même logique de seuils et les comptes par horaires réels, y compris pour l'après-midi et les étudiants quand leur créneau le prévoit.

## v0.5.40 - 2026-03-29

- Dashboard : le panneau `Jours alerte` n'affiche plus les jours critiques, qui restent uniquement visibles dans la tuile et le panneau `Jours critiques`.
- Dashboard : la tuile `Jour le plus tendu` est clarifiee en `Plus faible matin`, avec un detail explicite `matin / apres-midi` pour supprimer l'ambiguite sur la valeur affichee.

## v0.5.39 - 2026-03-29

- Dashboard : la vue mensuelle ajoute maintenant un indicateur `Demandes a risque` pour reperer les demandes d'absence `En attente` qui tombent sur des jours deja fragiles du mois.
- Dashboard : cette tuile est cliquable et affiche la liste detaillee des demandes concernees avec les dates a risque touchees et les effectifs matin / apres-midi de ces jours.

## v0.5.38 - 2026-03-29

- Dashboard : la carte `Vue mensuelle` affiche maintenant de vrais indicateurs du mois courant (`Jours alerte`, `Jours critiques`, `Jour le plus tendu`) au lieu de reprendre des donnees hebdomadaires.
- Dashboard : les tuiles `Jours alerte` et `Jours critiques` sont cliquables et ouvrent directement la liste des dates concernees avec les effectifs matin et apres-midi.
- Absences et Dashboard : la logique des seuils `alerte / critique` est maintenant partagee dans un module commun, base sur les memes valeurs par defaut.

## v0.5.37 - 2026-03-29

- Dashboard : la tuile `Effectifs par jour` affiche maintenant les effectifs `matin` et `apres-midi` sur chaque jour de la semaine, au lieu d'un seul compteur matin.
- Dashboard : ces deux compteurs sont calcules a partir des horaires reels du jour, y compris les horaires personnalises et les etudiants quand leur creneau tombe l'apres-midi.

## v0.5.36 - 2026-03-29

- Balisage : le module se cale maintenant sur le statut `actif / inactif` du RH, pour qu'un collaborateur inactif comme `KAMAR` n'entre plus dans les calculs actifs du suivi.
- Dashboard et page `Controle balisage` : les objectifs, alertes et classements ne comptent plus les profils RH inactifs, qui apparaissent desormais avec un badge `Inactif RH` et une edition desactivee.

## v0.5.35 - 2026-03-29

- Dashboard : la tuile `Suivi balisage` affiche maintenant l'objectif equipe complet sur `12 x 800` controles, au lieu d'une moyenne ramenee a `800` par collaborateur.
- Dashboard : le titre de la tuile devient `Controle balisage` pour mieux refleter le suivi de l'equipe de controle.

## v0.5.34 - 2026-03-29

- Dashboard : suppression de la tuile `Consigne / Note du jour`, qui affichait un message statique non relie a une source metier ou a Supabase.

## v0.5.33 - 2026-03-29

- RH : les fiches employes sont maintenant triees par ordre alphabetique pour rendre la navigation plus naturelle.
- Le champ de recherche libre est remplace par une liste deroulante `Tous les employes` ou `un employe precis`, afin de filtrer plus simplement les fiches RH.

## v0.5.32 - 2026-03-29

- RH : le champ `Observation` devient un select de statut RH (`Coordinateur`, `Collaborateur`, `Etudiant`, `Stagiaire`, `Autre`) avec une pastille couleur visible directement sur les fiches employes.
- Planning : les noms affichent maintenant cette meme pastille de statut dans les vues mois, semaine et jour, pour reperer le role de chaque collaborateur sans changer la structure du planning.

## v0.5.31 - 2026-03-29

- Module `Absences` : retrait du cache navigateur pour les demandes d'absence, qui ne sont plus relues ni reecrites dans un stockage local de session.
- Les pages `Absences`, `Planning` et `Dashboard` se mettent maintenant a jour a partir des reponses `Supabase` et d'un miroir memoire non persistant, avec purge de l'ancienne cle locale legacy.

## v0.5.30 - 2026-03-29

- Planning mois : les demandes d'absence `En attente` s'affichent maintenant directement sur les cases du planning avec un rendu hachure, sans etre confondues avec une absence deja validee.
- La vue Planning se resynchronise aussi avec les demandes d'absence au chargement et lors des mises a jour, afin que la surbrillance pending apparaisse, disparaisse ou se transforme correctement apres validation ou suppression.

## v0.5.29 - 2026-03-29

- Correctif `Plan TG` sur l'ajout de rayon : le positionnement `fin de liste`, `avant` et `après` respecte maintenant réellement l'emplacement choisi au lieu de remettre le nouveau rayon en tête.
- Le module distingue désormais le tri initial par ordre stocké et le simple réindexage des positions pour ne plus casser l'ordre après insertion ou déplacement.

## v0.5.28 - 2026-03-29

- Correctif du module `Balisage` : la page ne resauvegarde plus automatiquement son état d'écran dans le cache local, ce qui évite une boucle de refresh pouvant figer la navigation.
- Les mises à jour `Balisage` passent maintenant d'abord par `Supabase`, puis l'interface se recharge depuis la source synchronisée au lieu de conserver une modification locale seule.

## v0.5.27 - 2026-03-29

- Correctif du module `Plan TG` : les sauvegardes locales n'émettent plus de rafraîchissement global quand elles réécrivent exactement les mêmes données.
- La page `Plan TG` ignore maintenant les rechargements redondants quand l'état reçu est identique, ce qui évite un effet de boucle pouvant figer la navigation vers les autres modules.

## v0.5.26 - 2026-03-29

- Planning mois : la ligne `Effectif` affiche maintenant une legende explicite `matin` et `après-midi` dans la cellule de gauche pour clarifier la lecture des deux niveaux.
- Les effectifs du matin et de l'après-midi sont desormais tous les deux affiches en gras, avec un meilleur equilibre visuel entre la ligne du haut et celle du bas.

## v0.5.25 - 2026-03-29

- Planning mois : les tuiles `Tri caddie` et `Binômes repos` passent en affichage compact sur deux colonnes internes pour reduire nettement leur hauteur.
- `Tri caddie` affiche maintenant `lun/mar/mer` puis `jeu/ven/sam`, et les `Binômes repos` sont repartis en `1/2/3` puis `4/5/6`, tout en gardant chaque ligne modifiable.

## v0.5.24 - 2026-03-28

- Planning mois : le bloc `Repères matin` de `Abdou` et `Cecile` passe d'un bleu discret a un vert clair plus visible pour mieux ressortir du reste de l'equipe matin.
- Ce vert clair est applique sur toute la ligne en vue mois, y compris la colonne `Employe`, les cellules des jours et les horaires, pour un reperage immediat.

## v0.5.23 - 2026-03-28

- Planning mois : `Abdou` et `Cecile` ont maintenant un bleu dedie, un peu plus soutenu que le reste de l'equipe du matin, pour mieux les distinguer visuellement.
- Les couleurs de section se propagent desormais sur toute la ligne en vue mois, y compris dans les cellules des jours et des horaires, afin d'avoir un rendu coherent entre `repere matin`, `equipe matin`, `equipe apres-midi` et `etudiants`.

## v0.5.22 - 2026-03-28

- Planning : `Massimo` est maintenant traite comme coordinateur, avec un repere visuel renforce comme `Abdou`.
- Dans la vue mois, `Massimo` remonte en tete du bloc `equipe apres-midi` pour refleter son role de supervision sur l'apres-midi et les etudiants.

## v0.5.21 - 2026-03-28

- Planning mois : les lignes sont maintenant regroupees en sections lisibles avec `Abdou`, `Cecile`, puis l'equipe du matin, l'equipe de l'apres-midi et enfin les etudiants.
- Chaque grande categorie du planning mois dispose desormais d'un fond distinct pour mieux reperer les equipes d'un coup d'oeil.
- Les pastilles a cote des noms ont ete harmonisees avec ces categories pour servir de vrai repere visuel au lieu d'un code implicite peu lisible.

## v0.5.20 - 2026-03-28

- Planning : ajout du dimanche dans les vues mois, semaine et jour.
- Le dimanche est maintenant visible et editable, avec un statut par defaut `non travaille` pour toute l'equipe.
- Les alertes de sous-effectif ne se declenchent plus a tort le dimanche, qui reste une journee exceptionnelle par defaut.

## v0.5.19 - 2026-03-28

- Dashboard : retrait des encarts `Tri caddie` et `Binome repos` dans la tuile `Semaine / Effectifs par jour` pour eviter la redondance avec les autres cartes.

## v0.5.18 - 2026-03-28

- Ajustement visuel de la vue mois du planning : les cellules `Present` retrouvent un rendu coherent meme quand les overrides techniques ont ete nettoyes.
- Les vrais horaires personnalises restent visibles, mais un retour a l'horaire par defaut reprend maintenant l'apparence normale des autres cellules.

## v0.5.17 - 2026-03-28

- Correction du retour a l'horaire par defaut dans le planning : un horaire identique au referentiel RH n'est plus conserve comme un override visuel ou technique.
- Les cellules `PRESENT` qui correspondent simplement a l'horaire normal ne sont plus colorees comme des exceptions apres retour au defaut.

## v0.5.16 - 2026-03-28

- Correction de la relecture Supabase sur `Planning` et `Absences` : les tables sont maintenant lues en pagination complete au lieu d'une seule tranche limitee, ce qui evitait de perdre des horaires personnalises au reload ou apres navigation.
- Le planning retrouve maintenant bien les `horaire_custom` situes plus loin dans l'annee au lieu de retomber sur l'horaire issu du planning de base.

## v0.5.15 - 2026-03-28

- Correction du planning sur les modifications d'horaire seules : une edition d'horaire ne relance plus a tort la synchro `absences`, ce qui evitait l'effet de retour immediat a l'horaire par defaut.
- La passerelle `Planning -> Absences` ne se declenche plus que lorsqu'un vrai statut d'absence est cree, modifie ou retire.

## v0.5.14 - 2026-03-28

- Suppression de la persistance navigateur sur le flux `Planning` / `Absences` : les anciens caches `localStorage` sont purges et remplaces par un cache memoire de session.
- Le planning recharge maintenant les absences approuvees depuis Supabase comme source de verite pour les statuts d'absence, sans reintroduire les anciennes ombres locales.
- Une absence journee saisie depuis le planning se synchronise desormais dans la table `absences`, puis force un rechargement coherent du planning et du module absences.
- Une validation, un refus ou une suppression dans `Absences` remet maintenant a jour le planning au lieu de laisser un etat stale entre les deux modules.

## v0.5.13 - 2026-03-28

- Nettoyage technique du repo : `lint` repasse au vert et `build` reste OK apres exclusion des artefacts `.claude` de l'analyse.
- Le module `Balisage` remonte maintenant un message clair quand la sauvegarde Supabase echoue, au lieu de laisser une perte de synchro silencieuse.
- Simplification du composant `Agenda` du dashboard avec retrait des commentaires/instructions IA laisses dans le code et rendu conserve.
- Refactor du module `Plan TG / GB` pour rendre les handlers et transformations de lignes plus lisibles sans changer le comportement.
- Suppression des fichiers temporaires suivis `tmp_planning_data.js` et `tmp_planning_extract.txt`.

## v0.5.12 - 2026-03-26

- Correction du module `Absences` pour qu'un etat vide en base reste vraiment vide dans l'interface, sans retomber sur les donnees par defaut.
- Correction du module `Planning` pour utiliser un mois `YYYY-MM` dynamique sur `tri_caddie` et `binomes_repos` au lieu d'un filtre fige sur `2026-01`.
- Le planning charge et sauvegarde maintenant `tri caddie` et `binomes` en fonction du mois affiche dans la vue.
- Verification technique : lint OK, build OK.

- Correction bug critique balisage : les modifications saisies dans le tableau mensuel disparaissaient a chaque rechargement de page.
- Cause : `saveEdit()` sauvegardait uniquement en localStorage, mais `syncBalisageFromSupabase()` repartait toujours des donnees par defaut et ecrasait le localStorage a chaque montage de page.
- Fix : ajout de `saveBalisageEntryToSupabase()` dans `balisage-store.ts` qui upsert directement dans la table `balisage_mensuel` lors de chaque edition.
- Le cache `employeeIdByName` (name → id) est peuple lors de la sync initiale et recharge a la demande si vide.

## v0.5.11 - 2026-03-26

- Integration du module `Absences` avec le `Planning` lors de l'approbation d'une demande.
- Une absence passee en `APPROUVE` cree maintenant automatiquement des overrides dans `planning_entries` sur toute la plage concernee, hors dimanches.
- Les lignes deja presentes dans `planning_entries` sont preservees pour ne pas ecraser une modification manuelle existante.
- Prise en charge du cas `TOUS` cote projection planning en iterant sur les employes RH actifs.
- Verification technique : lint OK, build OK.

## v0.5.10 - 2026-03-26

- Diagnostic et correctif du module `RH` pour les cycles de repos bloques par la contrainte SQL `cycle_repos_semaine_cycle_check`.
- Ajout d'un message d'erreur plus explicite dans l'application quand la base Supabase n'autorise encore que les semaines `1` et `2`.
- La sauvegarde RH force maintenant un cycle complet de 5 semaines en memoire, et le modal de cycle affiche un etat `Enregistrement...` pendant la sauvegarde.
- Ajout du patch SQL [`supabase/patch_cycle_repos_5_weeks.sql`](/D:/Epicerie%20Manager%202026/supabase/patch_cycle_repos_5_weeks.sql) pour autoriser `semaine_cycle` entre `1` et `5`.
- Verification technique : lint OK, build OK.

## v0.5.9 - 2026-03-26

- Correctif du module `RH` sur l'enregistrement des cycles de repos depuis la fiche employe.
- La sauvegarde d'un cycle retombe maintenant sur l'ID employe en base meme si la fiche RH chargee en memoire n'a pas encore `dbId`.
- Correction ciblee pour eviter qu'un clic sur `Enregistrer` semble sans effet sur certains profils comme `ROSALIE`.
- Verification technique : lint OK, build OK.

## v0.5.8 - 2026-03-25

- Correctif du module `RH` sur l'affichage et la conservation des cycles de repos.
- La sync RH preserve maintenant les cycles existants et les valeurs par defaut 5 semaines avant d'appliquer les lignes renvoyees par `cycle_repos`.
- Correction pour eviter qu'un employe sans lignes completes dans `cycle_repos` perde l'affichage de son cycle dans la fiche RH.
- Verification technique : lint OK, build OK.

## v0.5.7 - 2026-03-25

- Correctif d'hydratation SSR/client sur le module `Planning`.
- Les etats initiaux sensibles (`year`, `month`, `selectedDate`, `overrides`, `triData`, `binomes`) utilisent maintenant des valeurs stables cote serveur.
- Chargement client reporte dans `useEffect` pour eviter les mismatchs React lies a `localStorage` et `new Date()`.
- Verification technique : lint OK, build OK.

## v0.5.6 - 2026-03-25

- Correctif `Planning` sur la reconstruction des overrides lors du sync Supabase.
- La sync preserve maintenant le contenu deja present dans `localStorage` avant d'appliquer les donnees venant du Sheet et de Supabase.
- Normalisation des statuts Supabase durcie pour mieux couvrir `CONGE_MAT`, `FORM`, `X` et les valeurs inattendues.
- Verification technique : lint OK, build OK.

## v0.5.5 - 2026-03-25

- Correction de la rehydratation du module `Planning` au refresh navigateur.
- Le planning relit maintenant immediatement le cache local navigateur au montage du composant avant le resync Supabase.
- Correction ciblee pour eviter qu'une modification visible avant refresh semble disparaitre apres `Ctrl+F5` alors qu'elle existe deja en base.
- Verification technique : lint OK, build OK.

## v0.5.4 - 2026-03-25

- Correction des dates du module `Planning` pour utiliser une cle date locale au lieu de `toISOString()`.
- Correction du repere "aujourd'hui" dans la vue mois quand le jour affiche un decalage.
- Correction de la persistance des modifications de planning qui pouvaient etre enregistrees sur un mauvais jour puis disparaitre apres actualisation.
- Verification technique : lint OK, build OK.

## v0.5.3 - 2026-03-25

- Vue mois du planning : remplacement du fond de la colonne du jour courant par un lisere vert vertical sur toute la colonne.
- Correction du rendu pour conserver des cellules blanches tout en gardant un repere plus net sur "aujourd'hui".
- Verification technique : lint OK, build OK.

## v0.5.2 - 2026-03-25

- Vue mois du planning retravaillee pour une lecture plus lisible.
- Alternance legere des lignes et separateurs de lignes renforces.
- Couleurs des statuts (`RH`, `CP`, `MAL`, `CONGE_MAT`, etc.) rendues plus franches.
- En-tete des jours amelioree avec abrevations 3 lettres (`Lun`, `Mar`, `Mer`, etc.).
- Colonne du jour courant rendue plus visible sur toute sa hauteur.

## v0.5.1 - 2026-03-25

- Ordre d'affichage du planning ajuste : `ABDOU` en premier, `CECILE` en deuxieme, puis ordre alphabetique.
- Etudiants deplaces a la fin de la liste et tries alphabetiquement.
- Mise en avant visuelle d'Abdou dans les vues du planning.

## v0.5.0 - 2026-03-25

- Module `Planning` branche sur Supabase pour les ecritures.
- Sauvegarde des cellules du planning dans `planning_entries`.
- Sauvegarde du tri caddie dans `tri_caddie`.
- Sauvegarde des binomes dans `binomes_repos`.
- Messages d'erreur et etat d'enregistrement ajoutes dans l'interface planning.

## v0.4.0 - 2026-03-25

- Module `RH` branche sur Supabase pour les ecritures.
- Creation d'employes dans `employees`.
- Mise a jour des fiches RH en base.
- Sauvegarde des cycles de repos dans `cycle_repos`.
- Synchronisation du cache local pour garder le reste de l'application a jour.

## v0.3.0 - 2026-03-25

- Module `Infos` branche sur Supabase pour les ecritures.
- Annonces enregistrees en base dans `annonces`.
- Documents enregistres en base dans `documents`.
- Upload des fichiers via Supabase Storage (`infos-documents`).
- Correction des ecarts entre le code front et le schema reel de Supabase.
- Correction des bugs de cache et de fallback sur le module `Infos`.

## v0.2.3 - 2026-03-25

- Nettoyage de la top bar et du dashboard.
- Affichage du `full_name` du profil connecte dans la barre du haut.
- Suppression du bouton `Vue d'ensemble`.
- Version deplacee sous le nom du module a gauche.
- Date enrichie avec une horloge digitale dans la top bar.
- Tuile hero du dashboard allegee en retirant la date et la version en doublon.

## v0.2.2 - a confirmer

- Etat de depart constate au debut de cette phase de travail.
- Version visible dans l'interface avant les ajustements effectues pendant cette session.
- Historique detaille anterieur a confirmer avec les anciennes conversations ou les commits git.


