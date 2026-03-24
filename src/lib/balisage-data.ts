export type BalisageEmployeeStat = {
  name: string;
  total: number;
  errorRate: number | null;
};

export const balisageObjective = 800;

export const balisageMonths = [
  { id: "JANV_2026", label: "Janvier" },
  { id: "FEVR_2026", label: "Fevrier" },
  { id: "MARS_2026", label: "Mars" },
  { id: "AVRIL_2026", label: "Avril" },
  { id: "MAI_2026", label: "Mai" },
  { id: "JUIN_2026", label: "Juin" },
  { id: "JUIL_2026", label: "Juillet" },
  { id: "AOUT_2026", label: "Aout" },
  { id: "SEPT_2026", label: "Septembre" },
  { id: "OCT_2026", label: "Octobre" },
  { id: "NOV_2026", label: "Novembre" },
  { id: "DEC_2026", label: "Decembre" },
];

const defaultEmployees: BalisageEmployeeStat[] = [
  { name: "MOHAMED", total: 0, errorRate: null },
  { name: "PASCALE", total: 0, errorRate: null },
  { name: "ROSALIE", total: 0, errorRate: null },
  { name: "WASIM", total: 0, errorRate: null },
  { name: "JEREMY", total: 0, errorRate: null },
  { name: "JAMAA", total: 0, errorRate: null },
  { name: "KAMEL", total: 0, errorRate: null },
  { name: "HASSANE", total: 0, errorRate: null },
  { name: "LIYAKATH", total: 0, errorRate: null },
  { name: "MOHCINE", total: 0, errorRate: null },
  { name: "CECILE", total: 0, errorRate: null },
];

export const balisageData: Record<string, BalisageEmployeeStat[]> = {
  MARS_2026: [
    { name: "KAMAR", total: 0, errorRate: null },
    { name: "PASCALE", total: 0, errorRate: null },
    { name: "ROSALIE", total: 0, errorRate: null },
    { name: "WASIM", total: 0, errorRate: null },
    { name: "JEREMY", total: 0, errorRate: null },
    { name: "JAMAA", total: 0, errorRate: null },
    { name: "KAMEL", total: 0, errorRate: null },
    { name: "HASSANE", total: 0, errorRate: null },
    { name: "LIYAKATH", total: 0, errorRate: null },
    { name: "MOHCINE", total: 0, errorRate: null },
    { name: "CECILE", total: 0, errorRate: null },
  ],
  FEVR_2026: [
    { name: "MOHAMED", total: 0, errorRate: null },
    { name: "PASCALE", total: 1055, errorRate: null },
    { name: "ROSALIE", total: 0, errorRate: null },
    { name: "WASIM", total: 97, errorRate: null },
    { name: "JEREMY", total: 1033, errorRate: null },
    { name: "JAMAA", total: 806, errorRate: null },
    { name: "KAMEL", total: 220, errorRate: null },
    { name: "HASSANE", total: 805, errorRate: null },
    { name: "LIYAKATH", total: 0, errorRate: null },
    { name: "MOHCINE", total: 0, errorRate: null },
    { name: "CECILE", total: 1327, errorRate: null },
  ],
  JANV_2026: [
    { name: "MOHAMED", total: 0, errorRate: null },
    { name: "PASCALE", total: 954, errorRate: 0.9 },
    { name: "ROSALIE", total: 750, errorRate: 0 },
    { name: "WASIM", total: 210, errorRate: 0 },
    { name: "JEREMY", total: 1589, errorRate: 0.2 },
    { name: "JAMAA", total: 939, errorRate: 0 },
    { name: "KAMEL", total: 822, errorRate: 0 },
    { name: "HASSANE", total: 972, errorRate: 0 },
    { name: "LIYAKATH", total: 1251, errorRate: 0.4 },
    { name: "MOHCINE", total: 0, errorRate: null },
    { name: "CECILE", total: 1532, errorRate: 0 },
  ],
  AVRIL_2026: defaultEmployees,
  MAI_2026: defaultEmployees,
  JUIN_2026: defaultEmployees,
  JUIL_2026: defaultEmployees,
  AOUT_2026: defaultEmployees,
  SEPT_2026: defaultEmployees,
  OCT_2026: defaultEmployees,
  NOV_2026: defaultEmployees,
  DEC_2026: defaultEmployees,
};
