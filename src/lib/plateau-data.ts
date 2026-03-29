export type PlateauZone = {
  name: string;
  owner: string;
  focus: string;
  notes: string;
};

export type PlateauWeek = {
  id: string;
  monthId: string;
  label: string;
  dateRange: string;
  theme: string;
  priority: string;
  zones: PlateauZone[];
};

export type PlateauMonth = {
  id: string;
  label: string;
  status: "Actif" | "Archive";
  pdfLabel: string;
};

export type PlateauOperation = {
  slot: string;
  zone?: string;
  operation: string;
};

export type PlateauTimelineOperation = {
  id: string;
  pl: "A" | "B" | "C";
  nom: string;
  zone: string;
  sFrom: number;
  sTo: number;
  mFrom: number;
  mTo: number;
};

export const plateauMonths: PlateauMonth[] = [
  {
    id: "2026-03",
    label: "Mars",
    status: "Actif",
    pdfLabel: "Recap plateau A, B, C, D",
  },
  {
    id: "2026-04",
    label: "Avril",
    status: "Archive",
    pdfLabel: "Preparation mensuelle",
  },
  {
    id: "2026-05",
    label: "Mai",
    status: "Archive",
    pdfLabel: "Recap plateau A, B, C, D",
  },
  {
    id: "2026-06",
    label: "Juin",
    status: "Archive",
    pdfLabel: "Recap plateau A, B, C, D",
  },
];

export const plateauWeeks: PlateauWeek[] = [
  {
    id: "2026-s13",
    monthId: "2026-03",
    label: "Semaine 13",
    dateRange: "du 23 au 29 mars",
    theme: "Pates, riz et accompagnements",
    priority: "Facings et lisibilite promo",
    zones: [
      {
        name: "Plateau A",
        owner: "Sabrina",
        focus: "Pates seches et sauces tomate",
        notes: "Verifier le bloc promo en tete d'allee et les facings familiaux.",
      },
      {
        name: "Plateau B",
        owner: "Katia",
        focus: "Riz, semoule et aides culinaires",
        notes: "Mettre en avant les references multi-lots et corriger les trous.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Conserves legumes et legumes secs",
        notes: "Priorite aux etiquettes prix et au reassort des best sellers.",
      },
      {
        name: "Plateau D",
        owner: "Renfort samedi",
        focus: "Cross-merch avec sauces et condiments",
        notes: "A preparer pour la fin de semaine selon le flux magasin.",
      },
    ],
  },
  {
    id: "2026-s14",
    monthId: "2026-03",
    label: "Semaine 14",
    dateRange: "du 30 mars au 5 avril",
    theme: "Petit-dejeuner et boissons chaudes",
    priority: "Bloc promo de debut de mois",
    zones: [
      {
        name: "Plateau A",
        owner: "Sabrina",
        focus: "Cafe moulu et capsules",
        notes: "Verifier le balisage et les mecaniques x2 produits.",
      },
      {
        name: "Plateau B",
        owner: "Katia",
        focus: "Chocolat poudre et cereales",
        notes: "Conserver une lecture simple pour le mobile et les renforts.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Biscuits petit-dejeuner",
        notes: "Prevoir la remise au propre apres le samedi.",
      },
      {
        name: "Plateau D",
        owner: "Manager",
        focus: "ILV et stop-rayons saisonniers",
        notes: "Zone de pilotage pour les ajustements de mise en avant.",
      },
    ],
  },
  {
    id: "2026-s15",
    monthId: "2026-04",
    label: "Semaine 15",
    dateRange: "du 6 au 12 avril",
    theme: "Apero et salaisons",
    priority: "Preparation periode vacances",
    zones: [
      {
        name: "Plateau A",
        owner: "Katia",
        focus: "Biscuits aperitif",
        notes: "Verifier les capacitaires avant implantation.",
      },
      {
        name: "Plateau B",
        owner: "Sabrina",
        focus: "Cacahuetes et fruits secs",
        notes: "Reprendre l'implantation du PDF de reference.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Tapas et olives",
        notes: "Confirmer l'espace disponible avec le rayon frais.",
      },
      {
        name: "Plateau D",
        owner: "Manager",
        focus: "Zone saisonniere",
        notes: "Ajustements a valider avant publication.",
      },
    ],
  },
];

export const plateauOperationsByMonth: Record<
  string,
  Record<string, PlateauOperation[]>
> = {
  "2026-03": {
    "Plateau A": [
      { slot: "Mars 1", zone: "Entree", operation: "Nettoyage rangement" },
      { slot: "Mars 3-4", zone: "Entree", operation: "Chocolat de Paques" },
      { slot: "Mars 3-4", zone: "Allee centrale", operation: "Foire au vin" },
    ],
    "Plateau B": [
      { slot: "Mars 1-2", zone: "Cote ecolier", operation: "Jardin" },
      { slot: "Mars 1-2", zone: "Cote LSE", operation: "Cuisson" },
      { slot: "Mars 3-4", zone: "Cote LSE", operation: "Paques non alimentaire" },
    ],
    "Plateau C/D": [
      { slot: "Mars 1", operation: "Fete de la mer" },
      { slot: "Mars 2-3", operation: "Little Italy" },
      { slot: "Mars 4", operation: "Tropiques" },
    ],
  },
  "2026-04": {
    "Plateau A": [
      { slot: "Avril 1", operation: "Gastro de Paques" },
      { slot: "Avril 2", operation: "Bebe" },
      { slot: "Avril 3", operation: "Repli bebe" },
    ],
    "Plateau B": [
      { slot: "Avril 1", operation: "Jardin + ete" },
      { slot: "Avril 2+", operation: "Ete non alimentaire" },
    ],
    "Plateau C/D": [
      { slot: "Avril 1", operation: "Gastro Paques MBA" },
      { slot: "Avril 2", operation: "Bretagne" },
      { slot: "Avril 3", operation: "Les halles" },
    ],
  },
  "2026-05": {
    "Plateau A": [
      { slot: "Mai 1-2", operation: "Top mai + ete lingerie" },
      { slot: "Mai 3", operation: "Bio produits laitiers" },
      { slot: "Mai 4", operation: "Ete apero + vins" },
    ],
    "Plateau B": [
      { slot: "Mai 1-5", operation: "Jardin + ete jouet" },
      { slot: "Mai 4-5", operation: "Fete des meres" },
    ],
    "Plateau C/D": [
      { slot: "Mai 1-2", operation: "MBA BBQ" },
      { slot: "Mai 3-4", operation: "Italie" },
      { slot: "Mai 5", operation: "XL fete des meres" },
    ],
  },
  "2026-06": {
    "Plateau A": [
      { slot: "Juin 1", operation: "Repli XL" },
      { slot: "Juin 2", operation: "Foire alcool BBQ" },
      { slot: "Juin 3", operation: "Beaute" },
      { slot: "Juin 4", operation: "Les top" },
    ],
    "Plateau B": [
      { slot: "Juin 1-3", operation: "Jardin" },
      { slot: "Juin 4", operation: "Soldes" },
      { slot: "Juin 3", operation: "Depart en vacances" },
    ],
    "Plateau C/D": [
      { slot: "Juin 1", operation: "Fete mer" },
      { slot: "Juin 2", operation: "Fete fleg" },
      { slot: "Juin 3", operation: "Fete des stands" },
      { slot: "Juin 4", operation: "Les halles" },
    ],
  },
};

export const PLATEAU_WEEK_MIN = 10;
export const PLATEAU_WEEK_MAX = 26;

export const plateauWeekDates: Record<number, { d: string; f: string; label: string }> = {
  10:{d:"3 mars",f:"9 mars",label:"3 → 9 mars"},
  11:{d:"10 mars",f:"16 mars",label:"10 → 16 mars"},
  12:{d:"17 mars",f:"23 mars",label:"17 → 23 mars"},
  13:{d:"24 mars",f:"30 mars",label:"24 → 30 mars"},
  14:{d:"31 mars",f:"6 avril",label:"31 mars → 6 avril"},
  15:{d:"7 avril",f:"13 avril",label:"7 → 13 avril"},
  16:{d:"14 avril",f:"20 avril",label:"14 → 20 avril"},
  17:{d:"21 avril",f:"27 avril",label:"21 → 27 avril"},
  18:{d:"28 avril",f:"4 mai",label:"28 avr → 4 mai"},
  19:{d:"5 mai",f:"11 mai",label:"5 → 11 mai"},
  20:{d:"12 mai",f:"18 mai",label:"12 → 18 mai"},
  21:{d:"19 mai",f:"25 mai",label:"19 → 25 mai"},
  22:{d:"26 mai",f:"1 juin",label:"26 mai → 1 juin"},
  23:{d:"2 juin",f:"8 juin",label:"2 → 8 juin"},
  24:{d:"9 juin",f:"15 juin",label:"9 → 15 juin"},
  25:{d:"16 juin",f:"22 juin",label:"16 → 22 juin"},
  26:{d:"23 juin",f:"29 juin",label:"23 → 29 juin"},
};

export const plateauTimelineOperations: PlateauTimelineOperation[] = [
  {id:"a1",pl:"A",nom:"Nettoyage rangement",zone:"Entrée mag + allée XL",sFrom:10,sTo:10,mFrom:2,mTo:2},
  {id:"a2",pl:"A",nom:"Pré-chocolat + Top foire alcool",zone:"Entrée + allée centrale",sFrom:11,sTo:11,mFrom:2,mTo:2},
  {id:"a3",pl:"A",nom:"Chocolat de Pâques",zone:"Entrée magasin",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"a4",pl:"A",nom:"Foire au vin",zone:"Allée centrale",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"a5",pl:"A",nom:"Gastro de Pâques",zone:"Allée centrale",sFrom:14,sTo:14,mFrom:3,mTo:3},
  {id:"a6",pl:"A",nom:"Bébé",zone:"Allée centrale",sFrom:15,sTo:16,mFrom:3,mTo:3},
  {id:"a7",pl:"A",nom:"Top Mai + Été lingerie",zone:"Entrée + allée",sFrom:18,sTo:19,mFrom:4,mTo:4},
  {id:"a8",pl:"A",nom:"Petit déj / Goûter",zone:"Entrée magasin",sFrom:20,sTo:21,mFrom:4,mTo:4},
  {id:"a9",pl:"A",nom:"Été apéro ALI + Vins",zone:"Allée centrale",sFrom:21,sTo:22,mFrom:4,mTo:5},
  {id:"a10",pl:"A",nom:"Foire alcool BBQ",zone:"Entrée mag",sFrom:24,sTo:24,mFrom:5,mTo:5},
  {id:"a11",pl:"A",nom:"Beauté",zone:"Entrée mag",sFrom:25,sTo:25,mFrom:5,mTo:5},
  {id:"b1",pl:"B",nom:"Jardin + été jouet",zone:"Côté écolier",sFrom:10,sTo:26,mFrom:2,mTo:5},
  {id:"b2",pl:"B",nom:"Cuisson",zone:"Côté LSE",sFrom:10,sTo:11,mFrom:2,mTo:2},
  {id:"b3",pl:"B",nom:"Pâques non AL",zone:"Côté LSE",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"b4",pl:"B",nom:"Été non AL",zone:"Côté LSE",sFrom:15,sTo:19,mFrom:3,mTo:4},
  {id:"b5",pl:"B",nom:"Fête des mères",zone:"Côté LSE",sFrom:21,sTo:22,mFrom:4,mTo:5},
  {id:"c1",pl:"C",nom:"Fête de la mer",zone:"",sFrom:10,sTo:10,mFrom:2,mTo:2},
  {id:"c2",pl:"C",nom:"Little Italy",zone:"",sFrom:11,sTo:12,mFrom:2,mTo:2},
  {id:"c3",pl:"C",nom:"Tropiques",zone:"",sFrom:13,sTo:13,mFrom:2,mTo:2},
  {id:"c4",pl:"C",nom:"Gastro Pâques MBA",zone:"",sFrom:14,sTo:14,mFrom:3,mTo:3},
  {id:"c5",pl:"C",nom:"Bretagne",zone:"",sFrom:15,sTo:15,mFrom:3,mTo:3},
  {id:"c6",pl:"C",nom:"Les Halles",zone:"",sFrom:16,sTo:16,mFrom:3,mTo:3},
  {id:"c7",pl:"C",nom:"MBA BBQ",zone:"",sFrom:17,sTo:19,mFrom:3,mTo:4},
  {id:"c8",pl:"C",nom:"Italie",zone:"",sFrom:20,sTo:21,mFrom:4,mTo:4},
  {id:"c9",pl:"C",nom:"Fête mer / Fête stands",zone:"",sFrom:23,sTo:25,mFrom:5,mTo:5},
];

export function getISOWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getCurrentPlateauWeek(today = new Date()) {
  const isoWeek = getISOWeekNumber(today);
  if (isoWeek < PLATEAU_WEEK_MIN) return PLATEAU_WEEK_MIN;
  if (isoWeek > PLATEAU_WEEK_MAX) return PLATEAU_WEEK_MAX;
  return isoWeek;
}

export function getPlateauWeekFocusData(focusWeek = getCurrentPlateauWeek()) {
  const week = Math.min(Math.max(focusWeek, PLATEAU_WEEK_MIN), PLATEAU_WEEK_MAX);
  const operations = plateauTimelineOperations.filter((operation) => operation.sFrom <= week && operation.sTo >= week);
  return {
    focusWeek: week,
    weekLabel: plateauWeekDates[week]?.label ?? `S${week}`,
    operations,
    byPlateau: {
      A: operations.filter((operation) => operation.pl === "A"),
      B: operations.filter((operation) => operation.pl === "B"),
      C: operations.filter((operation) => operation.pl === "C"),
    },
  };
}
