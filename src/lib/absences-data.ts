export type AbsenceTypeId =
  | "CP"
  | "MAL"
  | "CONGE_MAT"
  | "FORM"
  | "FERIE"
  | "AUTRE";

export type AbsenceStatusId = "APPROUVE" | "EN_ATTENTE" | "REFUSE";

export type AbsenceType = {
  id: AbsenceTypeId;
  label: string;
};

export type AbsenceStatus = {
  id: AbsenceStatusId;
  label: string;
};

export type AbsenceRequest = {
  id: number;
  dbId?: string;
  employee: string;
  type: AbsenceTypeId;
  startDate: string;
  endDate: string;
  status: AbsenceStatusId;
  note?: string;
};

export const absenceTypes: AbsenceType[] = [
  { id: "CP", label: "Conge paye" },
  { id: "MAL", label: "Maladie" },
  { id: "CONGE_MAT", label: "Conge maternite" },
  { id: "FORM", label: "Formation" },
  { id: "FERIE", label: "Jour ferie" },
  { id: "AUTRE", label: "Autre" },
];

export const absenceStatuses: AbsenceStatus[] = [
  { id: "APPROUVE", label: "Approuve" },
  { id: "EN_ATTENTE", label: "En attente" },
  { id: "REFUSE", label: "Refuse" },
];

export const absenceEmployees = [
  "ABDOU",
  "ACHRAF",
  "CECILE",
  "DILAXSHAN",
  "EL HASSANE",
  "FLORIAN",
  "JAMAA",
  "JEREMY",
  "KAMAR",
  "KAMEL",
  "KHANH",
  "LIYAKATH",
  "MAHIN",
  "MASSIMO",
  "MOHAMED",
  "MOHCINE",
  "MOUNIR",
  "PASCALE",
  "ROSALIE",
  "TOUS",
  "WASIM",
  "YLEANA",
] as const;

export const absenceRequests: AbsenceRequest[] = [
  {
    id: 1,
    employee: "KAMAR",
    type: "CONGE_MAT",
    startDate: "2026-01-01",
    endDate: "2028-01-01",
    status: "APPROUVE",
    note: "Conge maternite",
  },
  {
    id: 2,
    employee: "TOUS",
    type: "FERIE",
    startDate: "2026-01-01",
    endDate: "2026-01-01",
    status: "APPROUVE",
    note: "FERIE",
  },
  {
    id: 3,
    employee: "CARINE",
    type: "AUTRE",
    startDate: "2026-01-05",
    endDate: "2026-01-31",
    status: "APPROUVE",
    note: "X",
  },
  {
    id: 4,
    employee: "MASSIMO",
    type: "CP",
    startDate: "2026-02-16",
    endDate: "2026-02-16",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 5,
    employee: "KAMEL",
    type: "CP",
    startDate: "2026-02-09",
    endDate: "2026-02-14",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 6,
    employee: "JEREMY",
    type: "CP",
    startDate: "2026-06-01",
    endDate: "2026-06-20",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 7,
    employee: "KAMEL",
    type: "CP",
    startDate: "2026-06-15",
    endDate: "2026-07-04",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 8,
    employee: "WASIM",
    type: "AUTRE",
    startDate: "2026-06-29",
    endDate: "2026-10-31",
    status: "APPROUVE",
    note: "X",
  },
  {
    id: 9,
    employee: "JAMAA",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-15",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 10,
    employee: "EL HASSANE",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-08",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 11,
    employee: "MOHCINE",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-01",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 12,
    employee: "LIYAKATH",
    type: "CP",
    startDate: "2026-07-20",
    endDate: "2026-08-08",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 13,
    employee: "PASCALE",
    type: "CP",
    startDate: "2026-07-27",
    endDate: "2026-08-08",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 14,
    employee: "CECILE",
    type: "CP",
    startDate: "2026-07-27",
    endDate: "2026-08-22",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 15,
    employee: "ROSALIE",
    type: "CP",
    startDate: "2026-08-17",
    endDate: "2026-09-12",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 16,
    employee: "MASSIMO",
    type: "CP",
    startDate: "2026-09-14",
    endDate: "2026-09-19",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 17,
    employee: "JEREMY",
    type: "CP",
    startDate: "2026-09-14",
    endDate: "2026-09-19",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 18,
    employee: "MASSIMO",
    type: "CP",
    startDate: "2026-10-05",
    endDate: "2026-10-17",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 19,
    employee: "MAHIN",
    type: "CP",
    startDate: "2026-06-01",
    endDate: "2026-06-13",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 20,
    employee: "ACHRAF",
    type: "CP",
    startDate: "2026-06-29",
    endDate: "2026-07-11",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 21,
    employee: "MOHAMED",
    type: "CP",
    startDate: "2026-07-20",
    endDate: "2026-08-08",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 22,
    employee: "DILAXSHAN",
    type: "CP",
    startDate: "2026-08-17",
    endDate: "2026-08-29",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 23,
    employee: "YLEANA",
    type: "CP",
    startDate: "2026-08-17",
    endDate: "2026-08-29",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 24,
    employee: "KAMAR",
    type: "CONGE_MAT",
    startDate: "2026-06-01",
    endDate: "2026-10-31",
    status: "APPROUVE",
    note: "Conge maternite",
  },
  {
    id: 26,
    employee: "ROSALIE",
    type: "CP",
    startDate: "2026-03-23",
    endDate: "2026-03-28",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 27,
    employee: "CECILE",
    type: "CP",
    startDate: "2026-03-02",
    endDate: "2026-03-07",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 28,
    employee: "EL HASSANE",
    type: "CP",
    startDate: "2026-03-02",
    endDate: "2026-03-07",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 29,
    employee: "JAMAA",
    type: "CP",
    startDate: "2026-03-20",
    endDate: "2026-03-21",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 30,
    employee: "LIYAKATH",
    type: "CP",
    startDate: "2026-03-09",
    endDate: "2026-03-21",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 31,
    employee: "MASSIMO",
    type: "CP",
    startDate: "2026-03-09",
    endDate: "2026-03-14",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 32,
    employee: "DILAXSHAN",
    type: "CP",
    startDate: "2026-02-23",
    endDate: "2026-02-28",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 33,
    employee: "MOHAMED",
    type: "CP",
    startDate: "2026-02-23",
    endDate: "2026-02-28",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 34,
    employee: "MOHAMED",
    type: "CP",
    startDate: "2026-03-16",
    endDate: "2026-03-21",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 35,
    employee: "KHANH",
    type: "CP",
    startDate: "2026-03-02",
    endDate: "2026-03-07",
    status: "APPROUVE",
    note: "CP",
  },
  {
    id: 36,
    employee: "ABDOU",
    type: "CP",
    startDate: "2026-03-18",
    endDate: "2026-03-19",
    status: "APPROUVE",
    note: "CP",
  },
];
