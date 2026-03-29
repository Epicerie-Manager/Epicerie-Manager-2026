import type { CSSProperties } from "react";

export const collabTheme = {
  bg: "#faf8f5",
  card: "#fffdf9",
  line: "#e9dccd",
  text: "#2b2118",
  muted: "#8a7866",
  accent: "#D40511",
  accentDark: "#9f0f18",
  accentSoft: "#fff0f1",
  green: "#166534",
  greenBg: "#ecfdf5",
  amber: "#92400e",
  amberBg: "#fffbeb",
  blue: "#1d4ed8",
  blueBg: "#eff6ff",
  shadow: "0 8px 24px rgba(77, 48, 27, 0.08)",
};

export function collabCardStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: collabTheme.card,
    border: `1px solid ${collabTheme.line}`,
    borderRadius: 24,
    boxShadow: collabTheme.shadow,
    ...extra,
  };
}
