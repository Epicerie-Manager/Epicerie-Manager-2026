export type AbsenceTypeId =
  | "CP"
  | "RTT"
  | "DEPLACEMENT_RH"
  | "MAL"
  | "CONGE_MAT"
  | "FORM"
  | "FERIE"
  | "AUTRE";

export type AbsenceStatusId = "approuve" | "en_attente" | "refuse";

export type AbsenceType = {
  id: AbsenceTypeId;
  label: string;
};

export type AbsenceStatus = {
  id: AbsenceStatusId;
  label: string;
};

export type AbsenceRequest = {
  id: string;
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
  { id: "DEPLACEMENT_RH", label: "Deplacement RH" },
  { id: "MAL", label: "Maladie" },
  { id: "CONGE_MAT", label: "Conge maternite" },
  { id: "FORM", label: "Formation" },
  { id: "FERIE", label: "Jour ferie" },
  { id: "AUTRE", label: "Autre" },
];

export const absenceStatuses: AbsenceStatus[] = [
  { id: "approuve", label: "Approuve" },
  { id: "en_attente", label: "En attente" },
  { id: "refuse", label: "Refuse" },
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

export const absenceRequests: AbsenceRequest[] = [];
