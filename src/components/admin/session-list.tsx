"use client";

type SessionItem = {
  id: string;
  full_name: string;
  role: string;
  app_type: "bureau" | "collab" | "terrain";
  module_name: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  duration_label: string;
};

const APP_TONES = {
  bureau: { bg: "rgba(55, 138, 221, 0.15)", border: "var(--admin-border-blue)", text: "#8cc8ff", pill: "Bureau" },
  collab: { bg: "rgba(63, 185, 80, 0.15)", border: "var(--admin-border-green)", text: "#71d97d", pill: "Collab" },
  terrain: { bg: "rgba(210, 153, 34, 0.15)", border: "var(--admin-border-amber)", text: "#efc869", pill: "Terrain" },
} as const;

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatHour(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", " ·");
}

export function SessionList({
  items,
  compact = false,
}: {
  items: SessionItem[];
  compact?: boolean;
}) {
  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="admin-section-label">{compact ? "sessions recentes" : "historique des connexions"}</div>
        <div className="admin-mono" style={{ fontSize: 10, color: "var(--admin-text-muted)" }}>
          {items.length} session{items.length > 1 ? "s" : ""}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: 10,
          marginTop: 14,
          maxHeight: compact ? 300 : 520,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {items.length ? (
          items.map((session) => {
            const tone = APP_TONES[session.app_type];
            return (
              <div
                key={session.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0,1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--admin-border)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: tone.bg,
                    border: `1px solid ${tone.border}`,
                    color: tone.text,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {initials(session.full_name) || "??"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--admin-text-primary)", fontWeight: 500 }}>
                    {session.full_name}
                  </div>
                  <div className="admin-mono" style={{ marginTop: 2, fontSize: 10, color: "var(--admin-text-muted)" }}>
                    {session.role} · {session.module_name}
                  </div>
                  <div className="admin-mono" style={{ marginTop: 3, fontSize: 10, color: "var(--admin-text-faint)" }}>
                    Debut {formatDateTime(session.started_at)} · {session.ended_at ? `Fin ${formatDateTime(session.ended_at)}` : "Session en cours"} · {session.duration_label}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 9px",
                    borderRadius: 12,
                    fontWeight: 700,
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.text,
                  }}
                >
                  {tone.pill}
                </span>
              </div>
            );
          })
        ) : (
          <div className="admin-empty" style={{ textAlign: "center" }}>
            Aucune session enregistree pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
