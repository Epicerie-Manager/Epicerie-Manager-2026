"use client";

type LegendItem = {
  label: string;
  color: string;
  bg: string;
};

type PrintFooterProps = {
  version: string;
  legends?: LegendItem[];
};

export default function PrintFooter({ version, legends = [] }: PrintFooterProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 8,
        paddingTop: 6,
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {legends.map((legend) => (
          <span
            key={legend.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 7px",
              borderRadius: 999,
              background: legend.bg,
              color: legend.color,
              border: `1px solid ${legend.color}22`,
              fontSize: 8,
              fontWeight: 700,
            }}
          >
            {legend.label}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 8, color: "#64748b" }}>v{version}</div>
    </div>
  );
}
