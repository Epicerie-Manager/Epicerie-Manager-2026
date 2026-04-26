"use client";

type Item = {
  name: string;
  score: number;
  status: "ok" | "warn" | "err";
  alert?: string;
};

const TONES = {
  ok: { dot: "var(--admin-green)", fill: "var(--admin-green)", badgeBg: "var(--admin-bg-green)", badgeBorder: "var(--admin-border-green)", text: "#71d97d", label: "OK" },
  warn: { dot: "var(--admin-amber)", fill: "var(--admin-amber)", badgeBg: "var(--admin-bg-amber)", badgeBorder: "var(--admin-border-amber)", text: "#efc869", label: "ALERTE" },
  err: { dot: "var(--admin-red)", fill: "var(--admin-red)", badgeBg: "var(--admin-bg-red)", badgeBorder: "var(--admin-border-red)", text: "#ff8f8a", label: "ERREUR" },
} as const;

export function ModuleHealthList({ items }: { items: Item[] }) {
  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div className="admin-section-label">sante modules</div>
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {items.map((item) => {
          const tone = TONES[item.status];
          return (
            <div key={item.name} style={{ display: "grid", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--admin-border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) 90px 34px auto", gap: 10, alignItems: "center" }}>
                <span className="admin-status-dot" style={{ background: tone.dot }} />
                <span style={{ fontSize: 13, color: "var(--admin-text-primary)" }}>{item.name}</span>
                <div style={{ width: 90, height: 4, background: "var(--admin-bg-elevated)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${item.score}%`, height: "100%", background: tone.fill }} />
                </div>
                <span className="admin-mono" style={{ fontSize: 11, color: "var(--admin-text-secondary)", textAlign: "right" }}>
                  {item.score}%
                </span>
                <span
                  className="admin-mono"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 6,
                    border: `1px solid ${tone.badgeBorder}`,
                    background: tone.badgeBg,
                    color: tone.text,
                  }}
                >
                  {tone.label}
                </span>
              </div>
              {item.alert ? (
                <div className="admin-mono" style={{ fontSize: 10, color: tone.text, paddingLeft: 18 }}>
                  {item.alert}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
