"use client";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  badge?: string | null;
};

type MetricItem = {
  label: string;
  score?: number;
  status: "ok" | "warn" | "err";
  meta?: string;
};

type Props = {
  activeView: string;
  onViewChange: (view: string) => void;
  navItems: NavItem[];
  modules: MetricItem[];
  infrastructure: MetricItem[];
};

const DOT_BY_STATUS = {
  ok: "var(--admin-green)",
  warn: "var(--admin-amber)",
  err: "var(--admin-red)",
} as const;

export function AdminSidebar({ activeView, onViewChange, navItems, modules, infrastructure }: Props) {
  return (
    <aside className="admin-sidebar">
      <div style={{ display: "grid", gap: 22 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="admin-kicker admin-mono">navigation</div>
          <div style={{ display: "grid", gap: 6 }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--admin-border)",
                  borderLeft: item.id === activeView ? "2px solid #d40511" : "2px solid transparent",
                  background: item.id === activeView ? "var(--admin-bg-surface)" : "transparent",
                  color: item.id === activeView ? "var(--admin-text-primary)" : "var(--admin-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: "var(--admin-text-muted)" }}>{item.icon}</span>
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    style={{
                      borderRadius: 999,
                      border: "1px solid var(--admin-border-amber)",
                      background: "var(--admin-bg-amber)",
                      color: "var(--admin-amber)",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div className="admin-kicker admin-mono">modules</div>
          <div className="admin-panel" style={{ padding: 12, display: "grid", gap: 8 }}>
            {modules.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span className="admin-status-dot" style={{ background: DOT_BY_STATUS[item.status] }} />
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--admin-text-primary)" }}>{item.label}</span>
                  {typeof item.score === "number" ? (
                    <div
                      style={{
                        width: "100%",
                        height: 4,
                        borderRadius: 999,
                        background: "var(--admin-bg-elevated)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${item.score}%`,
                          height: "100%",
                          background: DOT_BY_STATUS[item.status],
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <span className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-secondary)" }}>
                  {typeof item.score === "number" ? `${item.score}%` : item.meta ?? "OK"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div className="admin-kicker admin-mono">infra</div>
          <div className="admin-panel" style={{ padding: 12, display: "grid", gap: 8 }}>
            {infrastructure.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr) auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span className="admin-status-dot" style={{ background: DOT_BY_STATUS[item.status] }} />
                <span style={{ fontSize: 12, color: "var(--admin-text-primary)" }}>{item.label}</span>
                <span className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-secondary)" }}>
                  {item.meta ?? "OK"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
