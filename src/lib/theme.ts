export type ModuleKey =
  | "dashboard"
  | "planning"
  | "plantg"
  | "plateau"
  | "balisage"
  | "absences"
  | "infos";

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
    light: "#eff6ff",
    medium: "#dbeafe",
    dark: "#143f6b",
    gradient: "linear-gradient(135deg, #eff6ff 0%, #f8fbff 50%, #fcfdff 100%)",
    iconGradient: "linear-gradient(135deg, #dbeafe, #bdd5f7)",
  },
  plantg: {
    color: "#167a48",
    light: "#f0faf4",
    medium: "#dcf5e7",
    dark: "#0d5430",
    gradient: "linear-gradient(135deg, #f0faf4 0%, #f7fcf9 50%, #fcfefc 100%)",
    iconGradient: "linear-gradient(135deg, #dcf5e7, #b6e8cc)",
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
    light: "#effcfd",
    medium: "#d5f3f8",
    dark: "#065567",
    gradient: "linear-gradient(135deg, #effcfd 0%, #f7feff 50%, #fcfeff 100%)",
    iconGradient: "linear-gradient(135deg, #d5f3f8, #ade6f0)",
  },
  absences: {
    color: "#5635b8",
    light: "#f5f2fe",
    medium: "#e8e2fb",
    dark: "#3b2480",
    gradient: "linear-gradient(135deg, #f5f2fe 0%, #faf8ff 50%, #fdfcff 100%)",
    iconGradient: "linear-gradient(135deg, #e8e2fb, #d1c6f6)",
  },
  infos: {
    color: "#a47208",
    light: "#fefaef",
    medium: "#faf0d5",
    dark: "#735006",
    gradient: "linear-gradient(135deg, #fefaef 0%, #fffcf5 50%, #fffefc 100%)",
    iconGradient: "linear-gradient(135deg, #faf0d5, #f4dfab)",
  },
};

export function getThemeByPathname(pathname: string): ModuleKey {
  if (pathname.startsWith("/planning")) return "planning";
  if (pathname.startsWith("/plan-tg")) return "plantg";
  if (pathname.startsWith("/plan-plateau") || pathname.startsWith("/plateaux")) {
    return "plateau";
  }
  if (pathname.startsWith("/stats") || pathname.startsWith("/balisage")) {
    return "balisage";
  }
  if (pathname.startsWith("/absences")) return "absences";
  if (pathname.startsWith("/infos")) return "infos";
  return "dashboard";
}
