"use client";

type BackupItem = {
  label: string;
  status: "ok" | "warn" | "err";
  meta: string;
};

const DOT_BY_STATUS = {
  ok: "var(--admin-green)",
  warn: "var(--admin-amber)",
  err: "var(--admin-red)",
} as const;

export function BackupStatusList({ items }: { items: BackupItem[] }) {
  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div className="admin-section-label">etat des sauvegardes</div>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr) auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span className="admin-status-dot" style={{ background: DOT_BY_STATUS[item.status] }} />
            <span style={{ fontSize: 12, color: "var(--admin-text-primary)" }}>{item.label}</span>
            <span className="admin-mono" style={{ fontSize: 11, color: "var(--admin-text-secondary)" }}>
              {item.meta}
            </span>
          </div>
        ))}
      </div>
      <div className="admin-mono" style={{ marginTop: 12, fontSize: 10, color: "var(--admin-text-muted)" }}>
        recharge les donnees dans votre session navigateur uniquement
      </div>
    </div>
  );
}
