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
