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
  "CECILE",
  "MASSIMO",
  "DILAXSHAN",
  "KAMAR",
  "YASSINE",
  "WASIM",
  "JEREMY",
  "KAMEL",
  "PASCALE",
  "MOHCINE",
  "LIYAKATH",
  "KHANH",
  "ROSALIE",
  "JAMAA",
  "EL HASSANE",
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
    employee: "JEREMY",
    type: "CP",
    startDate: "2026-06-01",
    endDate: "2026-06-20",
    status: "APPROUVE",
    note: "Vacances ete",
  },
  {
    id: 3,
    employee: "KAMEL",
    type: "CP",
    startDate: "2026-06-15",
    endDate: "2026-07-04",
    status: "APPROUVE",
    note: "Vacances ete",
  },
  {
    id: 4,
    employee: "WASIM",
    type: "AUTRE",
    startDate: "2026-06-29",
    endDate: "2026-10-31",
    status: "APPROUVE",
  },
  {
    id: 5,
    employee: "JAMAA",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-15",
    status: "APPROUVE",
  },
  {
    id: 6,
    employee: "EL HASSANE",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-08",
    status: "APPROUVE",
  },
  {
    id: 7,
    employee: "MOHCINE",
    type: "CP",
    startDate: "2026-07-13",
    endDate: "2026-08-01",
    status: "APPROUVE",
  },
  {
    id: 8,
    employee: "LIYAKATH",
    type: "CP",
    startDate: "2026-07-20",
    endDate: "2026-08-08",
    status: "APPROUVE",
  },
  {
    id: 9,
    employee: "CECILE",
    type: "CP",
    startDate: "2026-04-10",
    endDate: "2026-04-18",
    status: "EN_ATTENTE",
    note: "Demande recente",
  },
  {
    id: 10,
    employee: "ROSALIE",
    type: "CP",
    startDate: "2026-05-04",
    endDate: "2026-05-09",
    status: "EN_ATTENTE",
  },
];
