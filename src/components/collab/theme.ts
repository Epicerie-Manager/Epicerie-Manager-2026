import type { CSSProperties } from "react";

export const collabTheme = {
  bg: "#f0ece6",
  bgAlt: "#ebe4db",
  card: "#ffffff",
  line: "#e1d6ca",
  text: "#1a1410",
  muted: "#8f7d6c",
  accent: "#D40511",
  accentDark: "#9e0812",
  accentSoft: "#fff0f1",
  black: "#1a1410",
  blackSoft: "#2a221c",
  blue: "#1d5fa0",
  violet: "#5635b8",
  green: "#167a48",
  gold: "#a47208",
  greenBg: "#ebfbf1",
  amber: "#b57408",
  amberBg: "#fff5df",
  redBg: "#fff0f1",
  shadow: "0 2px 8px rgba(80,50,30,0.10)",
  titleFont: "var(--font-fraunces), Georgia, serif",
};

export function collabCardStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: collabTheme.card,
    border: `1px solid ${collabTheme.line}`,
    borderRadius: 16,
    boxShadow: collabTheme.shadow,
    ...extra,
  };
}

export function collabSerifTitleStyle(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: collabTheme.titleFont,
    color: collabTheme.text,
    letterSpacing: "-0.02em",
    ...extra,
  };
}
