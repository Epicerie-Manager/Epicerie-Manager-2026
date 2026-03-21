import type { ModuleKey } from "@/lib/theme";
import { moduleThemes } from "@/lib/theme";

type KPIProps = {
  value: string | number;
  label: string;
  moduleKey: ModuleKey;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
};

const fontSizeMap = {
  sm: "18px",
  md: "22px",
  lg: "26px",
};

export function KPI({
  value,
  label,
  moduleKey,
  icon,
  size = "lg",
  className,
  style,
}: KPIProps) {
  const theme = moduleThemes[moduleKey];
  const cardBackground = `linear-gradient(135deg, ${theme.light} 0%, color-mix(in srgb, ${theme.light} 60%, white) 100%)`;

  return (
    <div
      className={className}
      style={{
        flex: 1,
        borderRadius: "14px",
        padding: "12px 14px",
        background: cardBackground,
        border: `1px solid color-mix(in srgb, ${theme.medium} 80%, transparent)`,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
          pointerEvents: "none",
        }}
      />

      {icon ? (
        <div
          aria-hidden
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: theme.iconGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
            color: theme.color,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              width: "14px",
              height: "14px",
            }}
          >
            {icon}
          </span>
        </div>
      ) : null}

      <div
        style={{
          fontSize: fontSizeMap[size],
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: theme.dark,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#64748b",
          marginTop: "4px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function KPIRow({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "12px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
