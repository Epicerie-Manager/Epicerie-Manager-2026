"use client";

import { ALL_MODULES, type ModulePermissions } from "@/lib/modules-config";

type OfficeProfile = {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  module_permissions: ModulePermissions;
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function roleLabel(role: string) {
  if (role === "manager" || role === "admin") return "Manager complet";
  if (role === "viewer") return "Lecture seule";
  if (role === "gestionnaire") return "Gestionnaire";
  return "Acces personnalise";
}

function modulesLabel(role: string, permissions: ModulePermissions) {
  if (role === "manager" || role === "admin") return "Tous les modules";
  return (
    Object.entries(permissions)
      .slice(0, 2)
      .map(([moduleKey]) => ALL_MODULES.find((item) => item.key === moduleKey)?.label ?? moduleKey)
      .join(" · ") || "Acces personnalise"
  );
}

export function AccessCards({ profiles }: { profiles: OfficeProfile[] }) {
  return (
    <div className="admin-panel" style={{ padding: 18 }}>
      <div className="admin-section-label">acces bureau actifs</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
        {profiles.length ? (
          profiles.map((profile) => (
            <div
              key={profile.id}
              style={{
                background: "var(--admin-bg-base)",
                border: "1px solid var(--admin-border)",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  margin: "0 auto 10px",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(55, 138, 221, 0.14)",
                  color: "#8cc8ff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials(profile.full_name)}
              </div>
              <div style={{ fontSize: 13, color: "var(--admin-text-primary)", fontWeight: 500 }}>{profile.full_name}</div>
              <div className="admin-mono" style={{ marginTop: 3, fontSize: 10, color: "var(--admin-text-muted)" }}>
                {profile.email ?? ""}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 5,
                  background: "var(--admin-bg-surface)",
                  color: "var(--admin-text-secondary)",
                  fontSize: 11,
                }}
              >
                {roleLabel(profile.role)}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--admin-text-muted)", lineHeight: 1.45 }}>
                {modulesLabel(profile.role, profile.module_permissions)}
              </div>
            </div>
          ))
        ) : (
          <div className="admin-empty">Aucun acces bureau actif pour le moment.</div>
        )}
      </div>
    </div>
  );
}
