import { moduleThemes, radii, type ModuleKey } from "@/lib/theme";

type ProgressBarProps = {
  value: number;
  moduleKey?: ModuleKey;
  color?: string;
  trackColor?: string;
  showPercent?: boolean;
  label?: string;
  subLeft?: string;
  subRight?: string;
  height?: number;
  noShimmer?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function ProgressBar({
  value,
  moduleKey,
  color,
  trackColor,
  showPercent = false,
  label,
  subLeft,
  subRight,
  height = 10,
  noShimmer = false,
  className,
  style,
}: ProgressBarProps) {
  const theme = moduleKey ? moduleThemes[moduleKey] : undefined;
  const clamped = Math.max(0, Math.min(value, 100));
  const resolvedColor = color ?? theme?.color ?? "#2563eb";
  const resolvedTrackColor = trackColor ?? theme?.medium ?? "#ecf0f4";

  return (
    <div className={className} style={{ marginTop: 12, ...style }}>
      <style>{`
        @keyframes _epicerie_shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      {(label || showPercent) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "7px",
          }}
        >
          {label ? (
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              {label}
            </span>
          ) : null}
          {showPercent ? (
            <span style={{ fontSize: "12px", fontWeight: 700, color: resolvedColor }}>
              {clamped}%
            </span>
          ) : null}
        </div>
      )}

      <div
        style={{
          height,
          borderRadius: radii.pill,
          background: resolvedTrackColor,
          overflow: "hidden",
          position: "relative",
        }}
      >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: radii.pill,
          background: noShimmer
            ? `linear-gradient(90deg, ${resolvedColor}, color-mix(in srgb, ${resolvedColor} 58%, white))`
            : `linear-gradient(90deg, ${resolvedColor}, color-mix(in srgb, ${resolvedColor} 60%, white), ${resolvedColor})`,
          backgroundSize: "200% 100%",
          animation: noShimmer ? "none" : "_epicerie_shimmer 2.4s ease-in-out infinite",
          transition: "width 0.4s ease",
        }}
      />
      </div>

      {(subLeft || subRight) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          {subLeft ? <span>{subLeft}</span> : <span />}
          {subRight ? <span>{subRight}</span> : null}
        </div>
      )}
    </div>
  );
}
