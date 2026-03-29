export type PlanningEmployee = {
  id: string;
  name: string;
  role: string;
  standardShift: string;
  tuesdayShift: string;
  note?: string;
};

export type PlanningDay = {
  dayLabel: string;
  date: string;
  morningPresent: string;
  morningStatus: string;
  eveningPresent: string;
  eveningStatus: string;
  assignments: Record<string, string>;
};

export const planningEmployees: PlanningEmployee[] = [
  {
    id: "abdou",
    name: "ABDOU",
    role: "Coordo matin",
    standardShift: "3h50-11h20 / 14h-21h30",
    tuesdayShift: "3h00-10h30 / 12h-19h30",
  },
  {
    id: "cecile",
    name: "CECILE",
    role: "Collaborateur",
    standardShift: "3h50-11h20",
    tuesdayShift: "3h00-10h30",
  },
  {
    id: "massimo",
    name: "MASSIMO",
    role: "Coordinateur",
    standardShift: "14h-21h30",
    tuesdayShift: "12h-19h30",
    note: "Coordonnateur après-midi aligné avec la RH actuelle.",
  },
  {
    id: "kamar",
    name: "KAMAR",
    role: "Conge maternite",
    standardShift: "3h50-11h20",
    tuesdayShift: "3h00-10h30",
  },
  {
    id: "florian",
    name: "FLORIAN",
    role: "Employé",
    standardShift: "3h50-11h20",
    tuesdayShift: "3h00-10h30",
  },
  {
    id: "wasim",
    name: "WASIM",
    role: "Employé",
    standardShift: "3h50-11h20",
    tuesdayShift: "3h00-10h30",
  },
  {
    id: "jeremy",
    name: "JEREMY",
    role: "Employé",
    standardShift: "3h50-11h20",
    tuesdayShift: "3h00-10h30",
  },
];

export const planningDays: PlanningDay[] = [
  {
    dayLabel: "Lundi",
    date: "2026-02-23",
    morningPresent: "9",
    morningStatus: "1",
    eveningPresent: "3h50-11h20",
    eveningStatus: "3h50-11h20",
    assignments: {
      abdou: "14h-21h30",
      cecile: "CP",
      massimo: "Conge maternite",
      kamar: "x",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Mardi",
    date: "2026-02-24",
    morningPresent: "10",
    morningStatus: "1",
    eveningPresent: "3h00-10h30",
    eveningStatus: "3h00-10h30",
    assignments: {
      abdou: "12h-19h30",
      cecile: "CP",
      massimo: "Conge maternite",
      kamar: "x",
      florian: "3h00-10h30",
      wasim: "3h00-10h30",
      jeremy: "3h00-10h30",
    },
  },
  {
    dayLabel: "Mercredi",
    date: "2026-02-25",
    morningPresent: "10",
    morningStatus: "1",
    eveningPresent: "3h50-11h20",
    eveningStatus: "3h50-11h20",
    assignments: {
      abdou: "14h-21h30",
      cecile: "CP",
      massimo: "Conge maternite",
      kamar: "x",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Jeudi",
    date: "2026-02-26",
    morningPresent: "9",
    morningStatus: "X",
    eveningPresent: "X",
    eveningStatus: "3h50-11h20",
    assignments: {
      abdou: "3h50-11h20",
      cecile: "RH",
      massimo: "CP",
      kamar: "Conge maternite",
      florian: "x",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Vendredi",
    date: "2026-02-27",
    morningPresent: "9",
    morningStatus: "1",
    eveningPresent: "3h50-11h20",
    eveningStatus: "3h50-11h20",
    assignments: {
      abdou: "14h-21h30",
      cecile: "CP",
      massimo: "Conge maternite",
      kamar: "x",
      florian: "RH",
      wasim: "RH",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Samedi",
    date: "2026-02-28",
    morningPresent: "8",
    morningStatus: "6",
    eveningPresent: "RH",
    eveningStatus: "RH",
    assignments: {
      abdou: "14h-21h30",
      cecile: "CP",
      massimo: "Conge maternite",
      kamar: "x",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Dimanche",
    date: "2026-03-01",
    morningPresent: "X",
    morningStatus: "X",
    eveningPresent: "X",
    eveningStatus: "X",
    assignments: {
      abdou: "X",
      cecile: "X",
      massimo: "X",
      kamar: "Conge maternite",
      florian: "X",
      wasim: "X",
      jeremy: "X",
    },
  },
  {
    dayLabel: "Lundi",
    date: "2026-03-02",
    morningPresent: "9",
    morningStatus: "2",
    eveningPresent: "3h50-11h20",
    eveningStatus: "CP",
    assignments: {
      abdou: "14h-21h30",
      cecile: "14h-21h30",
      massimo: "Conge maternite",
      kamar: "RH",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Mardi",
    date: "2026-03-03",
    morningPresent: "10",
    morningStatus: "2",
    eveningPresent: "3h00-10h30",
    eveningStatus: "CP",
    assignments: {
      abdou: "14H-21H30",
      cecile: "12h-19h30",
      massimo: "Conge maternite",
      kamar: "8h-15h30",
      florian: "3h00-10h30",
      wasim: "3h00-10h30",
      jeremy: "3h00-10h30",
    },
  },
  {
    dayLabel: "Mercredi",
    date: "2026-03-04",
    morningPresent: "9",
    morningStatus: "1",
    eveningPresent: "3h50-11h20",
    eveningStatus: "CP",
    assignments: {
      abdou: "12h-19h30",
      cecile: "RH",
      massimo: "Conge maternite",
      kamar: "3h50-11h20",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
  {
    dayLabel: "Jeudi",
    date: "2026-03-05",
    morningPresent: "9",
    morningStatus: "2",
    eveningPresent: "3h50-11h20",
    eveningStatus: "CP",
    assignments: {
      abdou: "12h30-19h30",
      cecile: "14h-21h30",
      massimo: "Conge maternite",
      kamar: "3h50-11h20",
      florian: "3h50-11h20",
      wasim: "3h50-11h20",
      jeremy: "3h50-11h20",
    },
  },
];

export type PlanningCartRotation = {
  dayShort: string;
  pair: string;
};

export const planningCartRotation: PlanningCartRotation[] = [
  { dayShort: "LUN", pair: "CECILE + WASIM" },
  { dayShort: "MAR", pair: "ROSALIE + JAMAA" },
  { dayShort: "MER", pair: "JEREMY + KAMEL" },
  { dayShort: "JEU", pair: "EL HASSANE + LIYAKATH" },
  { dayShort: "VEN", pair: "KHANH + FLORIAN" },
  { dayShort: "SAM", pair: "MOHCINE + PASCALE" },
];

export const planningRestPairs = [
  "ROSALIE + JEREMY",
  "KHANH + CECILE",
  "MOHCINE + KAMEL",
  "EL HASSANE + JAMAA",
  "WASIM + LIYAKATH",
  "MOHAMED + PASCALE",
];
