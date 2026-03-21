import type { ModuleKey } from "@/lib/theme";
import { moduleThemes, radii, typography } from "@/lib/theme";

type KickerProps = {
  moduleKey: ModuleKey;
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Kicker({
  moduleKey,
  label,
  children,
  icon,
  className,
  style,
}: KickerProps) {
  const theme = moduleThemes[moduleKey];
  const content = label ?? children;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        minHeight: "26px",
        padding: "4px 9px",
        borderRadius: radii.badge,
        background: theme.medium,
        color: theme.color,
        fontSize: "10.5px",
        fontWeight: typography.kicker.weight,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        userSelect: "none",
        ...style,
      }}
    >
      {icon ? (
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "11px",
            height: "11px",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      ) : null}
      {content}
    </span>
  );
}
