export type ModuleKey =
  | "dashboard"
  | "planning"
  | "exports"
  | "plantg"
  | "planriz"
  | "plateau"
  | "balisage"
  | "ruptures"
  | "absences"
  | "infos"
  | "aide"
  | "admin"
  | "rh"
  | "suivi";

export type ModuleTheme = {
  color: string;
  light: string;
  medium: string;
  dark: string;
  gradient: string;
  iconGradient: string;
};

export const colors = {
  bg: "#f2f5f8",
  bgGradient:
    "radial-gradient(circle at top left, rgba(10,79,152,0.08), transparent 24%), linear-gradient(180deg, #f9fbfd 0%, #f2f5f8 100%)",
  card: "rgba(255,255,255,0.92)",
  cardSolid: "#ffffff",
  line: "#dbe3eb",
  border: "#e8ecf1",
  text: "#1e293b",
  textStrong: "#0f172a",
  muted: "#64748b",
  light: "#94a3b8",
  success: "#16a34a",
  successSoft: "#ecfdf5",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  info: "#2563eb",
  infoSoft: "#eff6ff",
} as const;

export const typography = {
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  h1: { size: "34px", weight: 700, letterSpacing: "-0.06em" },
  h2: { size: "20px", weight: 700, letterSpacing: "-0.02em" },
  body: { size: "14px", weight: 400, lineHeight: 1.55 },
  muted: { size: "13px", weight: 400, lineHeight: 1.55 },
  kicker: { size: "11px", weight: 700, letterSpacing: "0.04em" },
  badge: { size: "12px", weight: 600 },
} as const;

export const spacing = {
  cardPadding: "22px",
  sectionGap: "16px",
  itemGap: "10px",
} as const;

export const radii = {
  card: "20px",
  cardSm: "16px",
  cardXs: "14px",
  badge: "10px",
  icon: "12px",
  pill: "999px",
} as const;

export const shadows = {
  card: "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.02)",
  cardHover:
    "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.03)",
  subtle: "0 1px 4px rgba(0,0,0,0.05)",
} as const;

export const moduleThemes: Record<ModuleKey, ModuleTheme> = {
  dashboard: {
    color: "#b91c2e",
    light: "#fef1f2",
    medium: "#fce4e6",
    dark: "#7f1320",
    gradient: "linear-gradient(135deg, #fef1f2 0%, #fff8f8 50%, #fefafa 100%)",
    iconGradient: "linear-gradient(135deg, #fce4e6, #f9ced2)",
  },
  planning: {
    color: "#1d5fa0",
    light: "#e8f2ff",
    medium: "#c9e0ff",
    dark: "#143f6b",
    gradient: "linear-gradient(135deg, #e8f2ff 0%, #f3f8ff 52%, #fbfdff 100%)",
    iconGradient: "linear-gradient(135deg, #dbeafe, #bdd5f7)",
  },
  exports: {
    color: "#7c3aed",
    light: "#f5f3ff",
    medium: "#ede9fe",
    dark: "#4c1d95",
    gradient: "linear-gradient(135deg, #f5f3ff 0%, #faf7ff 52%, #fcfbff 100%)",
    iconGradient: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  },
  plantg: {
    color: "#167a48",
    light: "#e9f9f0",
    medium: "#c9efd9",
    dark: "#0d5430",
    gradient: "linear-gradient(135deg, #e9f9f0 0%, #f2fbf6 52%, #fbfefc 100%)",
    iconGradient: "linear-gradient(135deg, #dcf5e7, #b6e8cc)",
  },
  planriz: {
    color: "#0a4f98",
    light: "#edf5ff",
    medium: "#d6e7fb",
    dark: "#083c74",
    gradient: "linear-gradient(135deg, #edf5ff 0%, #f5f9ff 50%, #fcfdff 100%)",
    iconGradient: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
  },
  plateau: {
    color: "#c05a0c",
    light: "#fef6ee",
    medium: "#fde9d4",
    dark: "#854009",
    gradient: "linear-gradient(135deg, #fef6ee 0%, #fffaf4 50%, #fffdfa 100%)",
    iconGradient: "linear-gradient(135deg, #fde9d4, #f8d4af)",
  },
  balisage: {
    color: "#0b7a92",
    light: "#e8f9fc",
    medium: "#c0eaf3",
    dark: "#065567",
    gradient: "linear-gradient(135deg, #e8f9fc 0%, #f3fdff 52%, #fbfeff 100%)",
    iconGradient: "linear-gradient(135deg, #d5f3f8, #ade6f0)",
  },
  ruptures: {
    color: "#D40511",
    light: "#fff1f2",
    medium: "#ffd5d8",
    dark: "#9f0711",
    gradient: "linear-gradient(135deg, #fff1f2 0%, #fff7f8 52%, #fffdfd 100%)",
    iconGradient: "linear-gradient(135deg, #ffd9dc, #ffb8bf)",
  },
  absences: {
    color: "#5635b8",
    light: "#efeaff",
    medium: "#dbd0fb",
    dark: "#3b2480",
    gradient: "linear-gradient(135deg, #efeaff 0%, #f6f2ff 52%, #fcfbff 100%)",
    iconGradient: "linear-gradient(135deg, #e8e2fb, #d1c6f6)",
  },
  infos: {
    color: "#a47208",
    light: "#fef7e6",
    medium: "#f7e5bb",
    dark: "#735006",
    gradient: "linear-gradient(135deg, #fef7e6 0%, #fff9ee 52%, #fffcf8 100%)",
    iconGradient: "linear-gradient(135deg, #faf0d5, #f4dfab)",
  },
  aide: {
    color: "#0f766e",
    light: "#ecfeff",
    medium: "#cffafe",
    dark: "#155e75",
    gradient: "linear-gradient(135deg, #ecfeff 0%, #f4feff 50%, #fbffff 100%)",
    iconGradient: "linear-gradient(135deg, #cffafe, #a5f3fc)",
  },
  admin: {
    color: "#4f46e5",
    light: "#eef2ff",
    medium: "#dbe4ff",
    dark: "#312e81",
    gradient: "linear-gradient(135deg, #eef2ff 0%, #f6f7ff 50%, #fcfcff 100%)",
    iconGradient: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  },
  rh: {
    color: "#0f766e",
    light: "#f0fdfa",
    medium: "#ccfbf1",
    dark: "#115e59",
    gradient: "linear-gradient(135deg, #f0fdfa 0%, #f7fefb 50%, #fcfefd 100%)",
    iconGradient: "linear-gradient(135deg, #ccfbf1, #99f6e4)",
  },
  suivi: {
    color: "#8b5cf6",
    light: "#f5f3ff",
    medium: "#ddd6fe",
    dark: "#5b21b6",
    gradient: "linear-gradient(135deg, #f5f3ff 0%, #faf8ff 50%, #fcfbff 100%)",
    iconGradient: "linear-gradient(135deg, #ede9fe, #c4b5fd)",
  },
};

export function getThemeByPathname(pathname: string): ModuleKey {
  if (pathname.startsWith("/exports")) return "exports";
  if (pathname.startsWith("/planning")) return "planning";
  if (pathname.startsWith("/plan-tg")) return "plantg";
  if (pathname.startsWith("/plan-de-rayon") || pathname.startsWith("/plan-de-riz")) return "planriz";
  if (pathname.startsWith("/plan-plateau") || pathname.startsWith("/plateaux")) {
    return "plateau";
  }
  if (pathname.startsWith("/stats") || pathname.startsWith("/balisage")) {
    return "balisage";
  }
  if (pathname.startsWith("/ruptures")) return "ruptures";
  if (pathname.startsWith("/absences")) return "absences";
  if (pathname.startsWith("/infos")) return "infos";
  if (pathname.startsWith("/aide")) return "aide";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/rh")) return "rh";
  if (pathname.startsWith("/suivi")) return "suivi";
  return "dashboard";
}
