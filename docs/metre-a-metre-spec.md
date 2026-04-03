# Specification Mètre à Mètre

Source métier de référence :
- [FICHE_AUDIT_PGC_V9_5.html](C:/Users/Maison/Downloads/FICHE_AUDIT_PGC_V9_5.html)

Objectif :
- conserver exactement les mêmes sections
- conserver exactement les mêmes points de contrôle
- conserver la même logique métier d'évaluation
- autoriser une nouvelle forme d'interface plus adaptée à l'app manager mobile

## En-tête d'audit

Champs obligatoires :
- `audit_date`
- `rayon`
- `manager_name`
- `collaborator_name`

Champs complémentaires à prévoir dans l'app :
- `employee_id`
- `manager_user_id`

## Score global

- calculé sur 100
- pondéré par section

## Sections officielles

### 1. Présentation Rayon

- `section_key`: `presentation_rayon`
- `section_type`: `rating`
- `coefficient`: `20`
- `comment_key`: `presentation_comment`

Items :
- `fill_rate`
  - label: `Taux de remplissage`
  - type: `rating`
  - scale: `0..5`
- `planogram_compliance`
  - label: `Respect implantation`
  - type: `rating`
  - scale: `0..5`
- `facing_consistency`
  - label: `Facing / Cohérence`
  - type: `rating`
  - scale: `0..5`
- `shelf_cap_condition`
  - label: `État des casquettes`
  - type: `rating`
  - scale: `0..5`
- `department_cleanliness`
  - label: `Propreté du rayon`
  - type: `rating`
  - scale: `0..5`
- `out_of_place_items`
  - label: `OVNIS (hors rayon)`
  - type: `rating`
  - scale: `0..5`

### 2. Balisage & Signalétique

- `section_key`: `balisage_signaletique`
- `section_type`: `boolean`
- `coefficient`: `15`
- `comment_key`: `balisage_comment`

Items :
- `promo_signage_10x10`
  - label: `Balisage promo 10x10`
  - type: `boolean`
  - expected: `OUI`
- `promo_signage_20x10`
  - label: `Balisage promo 20x10`
  - type: `boolean`
  - expected: `OUI`
- `promo_signage_a4_tg`
  - label: `Balisage promo A4 TG`
  - type: `boolean`
  - expected: `OUI`
- `price_labels_present`
  - label: `Étiquettes prix présentes`
  - type: `boolean`
  - expected: `OUI`
- `label_left_of_product`
  - label: `Étiquette à gauche du produit`
  - type: `boolean`
  - expected: `OUI`
- `missing_labels_present`
  - label: `Étiquettes manquantes`
  - type: `boolean`
  - expected: `NON`

### 3. Ruptures & Fraîcheur

- `section_key`: `ruptures_fraicheur`
- `section_type`: `boolean`
- `coefficient`: `20`
- `comment_key`: `ruptures_comment`

Items :
- `stockout_flashed`
  - label: `Rupture flashée ?`
  - type: `boolean`
  - expected: `OUI`
- `stockout_processed`
  - label: `Traitement des ruptures effectué ?`
  - type: `boolean`
  - expected: `OUI`
- `expired_products_present`
  - label: `Produits périmés présents dans le rayon ?`
  - type: `boolean`
  - expected: `NON`

### 4. Réserve & Logistique

- `section_key`: `reserve_logistique`
- `section_type`: `boolean`
- `coefficient`: `20`
- `comment_key`: `reserve_comment`

Items :
- `pallets_wrapped`
  - label: `Palettes filmées`
  - type: `boolean`
  - expected: `OUI`
- `pallet_tagged`
  - label: `Palette balisée`
  - type: `boolean`
  - expected: `OUI`
- `trolley_sorting_done`
  - label: `Tri des caddies effectué`
  - type: `boolean`
  - expected: `OUI`
- `cardboard_or_plastic_present`
  - label: `Présence Cartons/Plastiques`
  - type: `boolean`
  - expected: `NON`
- `breakage_present`
  - label: `Présence Casse`
  - type: `boolean`
  - expected: `NON`
- `stacked_pallet_in_place`
  - label: `Palette gerbée à sa place`
  - type: `boolean`
  - expected: `OUI`

### 5. EPI

- `section_key`: `epi`
- `section_type`: `boolean`
- `coefficient`: `25`
- `comment_key`: `epi_comment`

Items :
- `auchan_vest_worn`
  - label: `Gilet Auchan`
  - type: `boolean`
  - expected: `OUI`
- `safety_shoes_worn`
  - label: `Chaussures de sécurité portées`
  - type: `boolean`
  - expected: `OUI`

### 6. Axes de Progrès

- `field_key`: `progress_axes`
- type: `long_text`
- label: `Axes de Progrès`

## Signatures

Champs à conserver si on veut reproduire l'esprit de la fiche :
- `manager_signature_data_url`
- `collaborator_signature_data_url`

## Règles de reconstruction app

- ne supprimer aucune section
- ne supprimer aucun item
- ne pas changer les réponses attendues
- les labels utilisateur doivent rester très proches de la fiche d'origine
- les `keys` peuvent être modernisées tant qu'elles restent stables
- la forme mobile peut être repensée librement

## Proposition d'affichage mobile manager

Ordre recommandé :
1. En-tête audit
2. Score en cours
3. Présentation Rayon
4. Balisage & Signalétique
5. Ruptures & Fraîcheur
6. Réserve & Logistique
7. EPI
8. Axes de progrès
9. Signatures
10. Enregistrer
