# Données Planning 2026 — Guide pour Codex

## Fichier de données
- `planning_data_2026.json` — Toutes les données extraites du Google Sheet

---

## Structure du JSON

### 1. `employees` — Liste des 21 employés

```json
{
  "name": "ABDOU",
  "type": "M",              // "M" = matin, "S" = soir (après-midi), "E" = étudiant
  "horaire_standard": "3h50-11h20",  // Lun, Mer, Jeu, Ven
  "horaire_mardi": "3h00-10h30",     // Mardi spécifique
  "horaire_samedi": null,            // null pour matin/soir, "14h-21h30" pour étudiants
  "observation": "Coordo",
  "actif": true                      // false = congé maternité (KAMAR)
}
```

**Employés matin (M)** : ABDOU, CECILE, KAMAR, YASSINE, WASIM, JEREMY, KAMEL, PASCALE, MOHCINE, LIYAKATH, KHANH, ROSALIE, JAMAA, EL HASSANE

**Employés soir (S)** : MASSIMO, DILAXSHAN

**Étudiants (E)** : YLEANA, MOUNIR, MAHIN, MOHAMED, ACHRAF — samedi uniquement

### 2. `cycle_repos` — Cycle 5 semaines par employé

```json
{
  "ABDOU": ["VEN", "VEN", "VEN", "VEN", "VEN"],
  "CECILE": ["MER", "MER", "MER", "MER", "SAM"],
  ...
}
```

Chaque tableau = 5 semaines. La semaine du cycle se calcule : `(ISO_week - 1) % 5`

### 3. `binomes_repos` — 6 binômes

```json
[
  ["ROSALIE", "JEREMY"],
  ["KHANH", "CECILE"],
  ["MOHCINE", "KAMEL"],
  ["EL HASSANE", "JAMAA"],
  ["WASIM", "LIYAKATH"],
  ["MOHAMED", "PASCALE"]
]
```

### 4. `exceptions` — Absences et événements spéciaux

```json
{
  "date_from": "2026-01-01",
  "date_to": "2028-01-01",
  "employee": "KAMAR",
  "type": "Congé maternité"
}
```

**Types possibles** :
- `"Congé maternité"` → statut CONGE_MAT
- `"CP"` → Congé payé
- `"FERIE"` → Jour férié (employee = "TOUS" pour tout le monde)
- `"X"` → Non travaillé / absence longue durée

**36 exceptions au total**, incluant tous les CP d'été, congés maternité, fériés, etc.

### 5. `planning` — Données jour par jour, mois par mois

C'est la partie la plus importante. Pour chaque mois, un tableau de jours :

```json
{
  "MARS 2026": [
    {
      "date": "2026-02-23",
      "jour": "LUNDI",
      "matin_present": "9",
      "soir_present": "1",
      "cells": {
        "ABDOU": "3h50-11h20",
        "CECILE": "3h50-11h20",
        "MASSIMO": "14h-21h30",
        "DILAXSHAN": "CP",
        "KAMAR": "Congé maternité",
        "YASSINE": "x",
        "WASIM": "3h50-11h20",
        "JEREMY": "3h50-11h20",
        "KAMEL": "3h50-11h20",
        "PASCALE": "RH",
        "MOHCINE": "3h50-11h20",
        "LIYAKATH": "RH",
        "KHANH": "3h50-11h20",
        "ROSALIE": "3h50-11h20",
        "JAMAA": "3h50-11h20",
        "EL HASSANE": "3h50-11h20",
        "YLEANA": "X",
        "MOUNIR": "X",
        "MAHIN": "X",
        "MOHAMED": "X",
        "ACHRAF": "X"
      }
    },
    ...
  ]
}
```

### Comment interpréter la valeur d'une cellule

| Valeur dans cells | Signification | Statut |
|-------------------|--------------|--------|
| `"3h50-11h20"` | Présent avec cet horaire | PRESENT |
| `"3h00-10h30"` | Présent (horaire mardi) | PRESENT |
| `"3H50-11H20"` | Présent (même horaire, casse différente) | PRESENT |
| `"14h-21h30"` | Présent après-midi | PRESENT |
| `"12h-19h30"` | Présent (horaire mardi soir) | PRESENT |
| `"12H-19H30"` | Présent (même, casse différente) | PRESENT |
| `"RH"` | Repos hebdomadaire | RH |
| `"RH "` | Repos (avec espace trailing) | RH |
| `"CP"` | Congé payé | CP |
| `"Congé maternité"` | Congé maternité | CONGE_MAT |
| `"FERIE"` | Jour férié | FERIE |
| `"X"` ou `"x"` | Non travaillé | X |
| `"#N/A"` | Donnée non calculée dans le Sheet | Utiliser le défaut |
| `""` (vide) | Pas de donnée | Utiliser le défaut |
| Un horaire custom | Ex: "6h-13h30" | PRESENT (horaire modifié) |

**ATTENTION aux espaces trailing** : Certains noms ont des espaces en fin (`"PASCALE "`, `"MOHCINE "`, `"LIYAKATH"`, etc.). Codex doit faire un `.trim()` sur les noms.

**ATTENTION à la casse** : Les horaires peuvent être en minuscules `"3h50-11h20"` ou majuscules `"3H50-11H20"`. Traiter les deux comme identiques.

---

## Comment Codex doit utiliser ces données

### Priorité 1 : Les cellules du planning sont la source de vérité

Pour chaque jour et chaque employé, la valeur dans `planning[mois][jour].cells[employee]` EST ce qui doit s'afficher. C'est ce que la manager a saisi dans le Google Sheet.

**Ne pas recalculer** les horaires à partir du cycle repos + horaires par défaut. Les cellules contiennent déjà le résultat final (horaire si présent, "RH" si repos, "CP" si congé, etc.).

### Priorité 2 : Pour les mois non remplis (Oct, Nov, Déc)

Les mois d'Octobre, Novembre et Décembre dans le fichier Excel n'ont pas de données réelles (ils contiennent les valeurs du modèle/template). Pour ces mois, utiliser le calcul automatique :

1. Vérifier les exceptions (absences, fériés)
2. Appliquer le cycle de repos
3. Appliquer les horaires par défaut

### Algorithme de rendu d'une cellule

```typescript
function getCellValue(employee: string, date: Date, planningData: any): string {
  const monthKey = getMonthKey(date); // "MARS 2026"
  const dateStr = formatDate(date);   // "2026-03-15"
  
  // 1. Chercher dans les données du planning
  const monthData = planningData.planning[monthKey];
  if (monthData) {
    const dayData = monthData.find(d => d.date === dateStr);
    if (dayData && dayData.cells[employee]) {
      const val = dayData.cells[employee].trim();
      if (val && val !== "#N/A" && val !== "") {
        return val; // Source de vérité : ce qui est dans le Sheet
      }
    }
  }
  
  // 2. Fallback : vérifier les exceptions
  const exception = planningData.exceptions.find(e => 
    e.employee === employee && e.date_from <= dateStr && e.date_to >= dateStr
  );
  if (exception) return exception.type;
  
  // 3. Fallback : calculer depuis le cycle repos
  const emp = planningData.employees.find(e => e.name === employee);
  if (!emp || !emp.actif) return "Congé maternité";
  
  const dow = date.getDay(); // 0=dim
  if (dow === 0) return "X";
  if (emp.type === "E") return dow === 6 ? emp.horaire_samedi : "X";
  
  const cycle = planningData.cycle_repos[employee];
  if (cycle) {
    const cycleWeek = (getISOWeek(date) - 1) % 5;
    const jourCodes = { 1:"LUN", 2:"MAR", 3:"MER", 4:"JEU", 5:"VEN", 6:"SAM" };
    if (cycle[cycleWeek] === jourCodes[dow]) return "RH";
  }
  
  // 4. Présent avec horaire par défaut
  if (dow === 2) return emp.horaire_mardi;
  return emp.horaire_standard;
}
```

### Affichage dans la grille

```typescript
function renderCell(value: string): { display: string; statut: string; color: string } {
  const v = value.trim().toUpperCase();
  
  if (v === "RH") return { display: "RH", statut: "RH", color: "purple" };
  if (v === "CP") return { display: "CP", statut: "CP", color: "amber" };
  if (v === "FERIE") return { display: "FÉRIÉ", statut: "FERIE", color: "gray" };
  if (v === "X") return { display: "X", statut: "X", color: "gray" };
  if (v.includes("CONGÉ MATERNITÉ") || v.includes("CONGE MATERNITE")) 
    return { display: "C.M", statut: "CONGE_MAT", color: "orange" };
  if (v.includes("MAL")) return { display: "MAL", statut: "MAL", color: "red" };
  
  // Si c'est un horaire → présent
  if (v.includes("H") && v.includes("-")) 
    return { display: value.trim(), statut: "PRESENT", color: "green" };
  
  return { display: value.trim(), statut: "UNKNOWN", color: "gray" };
}
```

---

## Résumé des fichiers à envoyer

| Fichier | Contenu | Taille |
|---------|---------|--------|
| `planning_data_2026.json` | Toutes les données (employés, cycles, exceptions, planning 12 mois) | ~300 Ko |
| Ce document (`GUIDE_DONNEES_PLANNING.md`) | Comment interpréter et utiliser les données | Ce fichier |

## Points d'attention pour Codex

1. **Trim tous les noms** — `"PASCALE "` → `"PASCALE"`, `"MOHCINE "` → `"MOHCINE"`
2. **Case insensitive sur les horaires** — `"3H50-11H20"` = `"3h50-11h20"`
3. **`#N/A` = pas de donnée** — utiliser le calcul par défaut
4. **Les étudiants n'apparaissent que le samedi** — tous les autres jours = "X"
5. **YASSINE remplace MOHAMED dans certains mois** — La colonne "MOHAMED" dans le header peut être "YASSINE" selon le mois (vérifier le header de chaque onglet)
6. **Attention aux noms avec espaces** — Le JSON a déjà les noms nettoyés dans `employees` mais les clés dans `cells` peuvent avoir des espaces trailing
7. **Les compteurs matin_present/soir_present** sont déjà calculés dans le Sheet — Codex peut les utiliser directement ou les recalculer
8. **Les mois Oct/Nov/Déc** ont des données template, pas des données réelles — les traiter comme "à calculer"
