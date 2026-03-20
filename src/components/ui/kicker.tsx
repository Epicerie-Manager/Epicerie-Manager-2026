import type { ModuleKey } from "@/lib/theme";
import { moduleThemes, radii, typography } from "@/lib/theme";

type KickerProps = {
  moduleKey: ModuleKey;
  children: React.ReactNode;
};

export function Kicker({ moduleKey, children }: KickerProps) {
  const theme = moduleThemes[moduleKey];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "28px",
        padding: "0 10px",
        borderRadius: radii.badge,
        background: theme.medium,
        color: theme.dark,
        fontSize: typography.kicker.size,
        fontWeight: typography.kicker.weight,
        letterSpacing: typography.kicker.letterSpacing,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
