"use client";

type DayItem = {
  dayKey: string;
  label: string;
  status: "future" | "none" | "partial" | "complete";
};

function cellStyle(status: DayItem["status"]) {
  if (status === "complete") {
    return { background: "rgba(63, 185, 80, 0.16)", border: "1px solid var(--admin-border-green)", color: "#71d97d" };
  }
  if (status === "partial") {
    return { background: "rgba(210, 153, 34, 0.16)", border: "1px solid var(--admin-border-amber)", color: "#efc869" };
  }
  if (status === "future") {
    return { background: "transparent", border: "1px solid var(--admin-border)", color: "var(--admin-text-muted)" };
  }
  return { background: "var(--admin-bg-elevated)", border: "1px solid var(--admin-border)", color: "var(--admin-text-secondary)" };
}

export function RupturesCalendar({ days, alert }: { days: DayItem[]; alert?: string | null }) {
  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div className="admin-section-label">imports ruptures</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 14 }}>
        {days.map((day) => (
          <div
            key={day.dayKey}
            style={{
              minHeight: 42,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 700,
              ...cellStyle(day.status),
            }}
          >
            {day.label}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, fontSize: 11, color: "var(--admin-text-secondary)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--admin-bg-elevated)" }} />Aucun</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(210, 153, 34, 0.6)" }} />1 import</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(63, 185, 80, 0.7)" }} />2 imports</span>
      </div>
      {alert ? <div className="admin-note--danger admin-mono" style={{ marginTop: 12 }}>{alert}</div> : null}
    </div>
  );
}
