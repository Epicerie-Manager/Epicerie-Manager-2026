"use client";

type Props = {
  icon: string;
  iconBg: string;
  iconBorder: string;
  value: string;
  label: string;
  sublabel: string;
  trend?: string;
  valueColor?: string;
  trendColor?: string;
};

export function KpiCard({
  icon,
  iconBg,
  iconBorder,
  value,
  label,
  sublabel,
  trend,
  valueColor,
  trendColor,
}: Props) {
  return (
    <div className="admin-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 13,
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          display: "grid",
          placeItems: "center",
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          className="admin-mono"
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: valueColor ?? "var(--admin-text-primary)",
          }}
        >
          {value}
        </div>
        <div style={{ marginTop: 5, fontSize: 13, color: "var(--admin-text-secondary)", fontWeight: 500 }}>{label}</div>
        <div className="admin-mono" style={{ marginTop: 3, fontSize: 11, color: "var(--admin-text-muted)" }}>
          {sublabel}
        </div>
        {trend ? (
          <div style={{ marginTop: 8, fontSize: 11, color: trendColor ?? "var(--admin-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            {trend}
          </div>
        ) : null}
      </div>
    </div>
  );
}
