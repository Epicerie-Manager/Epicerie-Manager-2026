"use client";

type HourBar = {
  hour: number;
  sessions: number;
};

type AppSummary = {
  appType: "bureau" | "collab" | "terrain";
  sessions: number;
  avgDuration: number;
};

const APP_LABELS = {
  bureau: "Bureau",
  collab: "Collab",
  terrain: "Terrain",
} as const;

export function ActivityChart({ hours, summary }: { hours: HourBar[]; summary: AppSummary[] }) {
  const max = Math.max(...hours.map((item) => item.sessions), 1);
  const currentHour = new Date().getHours();

  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div className="admin-section-label">activite aujourd'hui</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0,1fr))", gap: 6, alignItems: "end", marginTop: 14 }}>
        {hours.map((item) => {
          const height = item.sessions === 0 ? 4 : Math.max(6, Math.round((item.sessions / max) * 72));
          return (
            <div key={item.hour} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <div style={{ width: 18, height: 72, display: "flex", alignItems: "end" }}>
                <div
                  style={{
                    width: "100%",
                    height,
                    borderRadius: 999,
                    background: item.hour === currentHour ? "#185fa5" : "rgba(140, 200, 255, 0.8)",
                  }}
                />
              </div>
              <div className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-secondary)" }}>
                {item.hour}h
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr .8fr",
          gap: 8,
          alignItems: "center",
          marginTop: 14,
        }}
      >
        <div className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Interface</div>
        <div className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Sessions</div>
        <div className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Duree moy.</div>
        {summary.flatMap((item) => [
          <div key={`${item.appType}-label`} style={{ fontSize: 12, color: "var(--admin-text-primary)" }}>{APP_LABELS[item.appType]}</div>,
          <div key={`${item.appType}-sessions`} style={{ fontSize: 12, color: "var(--admin-text-secondary)" }}>{item.sessions}</div>,
          <div key={`${item.appType}-duration`} style={{ fontSize: 12, color: "var(--admin-text-secondary)" }}>{item.avgDuration ? `${item.avgDuration} min` : "0 min"}</div>,
        ])}
      </div>
    </div>
  );
}
