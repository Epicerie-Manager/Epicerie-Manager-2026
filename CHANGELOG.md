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
