# Audit persistance Supabase

Date : 11 avril 2026

## Conclusion

Les donnees metier modifiables de l'application sont desormais sauvegardees via Supabase sur tous les modules audites.

Le seul trou fonctionnel detecte pendant cet audit etait `PlantTG` :
- les modifications restaient dans l'etat React et un snapshot navigateur,
- aucune ecriture metier n'etait envoyee vers Supabase,
- un autre appareil ne pouvait donc pas voir les changements.

Ce point a ete corrige.

## Modules verifies

### OK - ecritures metier vers Supabase

- `PlantTG` : `saveTgWeekPlansToSupabase()` depuis `src/app/plan-tg/page.tsx`
- `Planning manager` : `savePlanningOverridesToSupabase()`, `savePlanningTriPairToSupabase()`, `savePlanningBinomeToSupabase()`
- `Absences manager + collab` : `createAbsenceRequestInSupabase()`, `updateAbsenceStatusInSupabase()`, `deleteAbsenceRequestInSupabase()`
- `RH` : `createRhEmployeeInSupabase()`, `updateRhEmployeeInSupabase()`, `saveRhCycleInSupabase()`
- `Infos / documents / annonces` : `addDocumentToSupabase()`, `addAnnouncementToSupabase()`, `removeAnnouncementFromSupabase()`
- `Suivi terrain` : `saveMetreAudit()`, `updateMetreAudit()`, `deleteMetreAudit()`
- `Planning CP export` : `savePlanningCpExportToSupabase()`
- `Balisage / stats` : `saveBalisageEntryToSupabase()`
- `Seuils de presence` : `savePresenceThresholdsToSupabase()`
- `Plateau` : `savePlateauAssetsToSupabase()`, `removePlateauAssetFromSupabase()`, `savePlateauNoteToSupabase()`
- `Ruptures` : `saveParsedRupturesImport()` et affectation detail vers Supabase

### OK - lecture seule ou ecrans de consultation

- `collab/plan-tg`
- `exports/tg`
- `exports/planning`
- `exports/balisage`
- `manager/terrain`

## Caches locaux restants

Les usages locaux restants identifies ne concernent pas la persistance metier partagee :

- `src/app/page.tsx`
  cache d'affichage temporaire du widget planning dashboard
  memorisation locale des annonces dashboard fermees
- `src/components/collab/layout.tsx`
  memorisation locale du badge "reponse absence deja vue"
- `src/lib/browser-session.ts`
  session navigateur / derniere activite

Ces elements sont des preferences ou aides d'affichage. Ils ne servent pas de source de verite metier.

## Correctifs appliques pendant l'audit

- ajout de l'ecriture `PlantTG` vers Supabase
- suppression du fallback `localStorage` metier sur `PlantTG`
- conservation d'un snapshot memoire seulement, puis resynchronisation via Supabase
- ajout de tests unitaires sur `tg-store`

## Fichiers touches

- `src/lib/tg-store.ts`
- `src/app/plan-tg/page.tsx`
- `src/lib/tg-store.test.ts`
