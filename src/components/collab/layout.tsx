"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import appPackage from "../../../package.json";
import { collabCardStyle, collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { getMyAbsences } from "@/lib/collab-data";
import { getCollabInfosFromSupabase } from "@/lib/infos-store";

function CollabGlyph({ kind, color = "currentColor", size = 18 }: { kind: "home" | "planning" | "absences" | "tg" | "infos" | "plateau"; color?: string; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };

  if (kind === "home") {
    return (
      <svg {...props}>
        <path d="M4.5 10.4L12 4.6L19.5 10.4V18.2A1.3 1.3 0 0 1 18.2 19.5H5.8A1.3 1.3 0 0 1 4.5 18.2V10.4Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.2 19.2V13.6H14.8V19.2" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "planning") {
    return (
      <svg {...props}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="3" stroke={color} strokeWidth="1.8" />
        <path d="M7.5 3.8V7.2M16.5 3.8V7.2M3.8 9.5H20.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "absences") {
    return (
      <svg {...props}>
        <path d="M7 4.5H15.5L19 8V18.5A1.5 1.5 0 0 1 17.5 20H7A2 2 0 0 1 5 18V6.5A2 2 0 0 1 7 4.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15 4.8V8.2H18.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "tg") {
    return (
      <svg {...props}>
        <path d="M7 10.5V18M12 6.5V18M17 3.5V18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 18.5H19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "plateau") {
    return (
      <svg {...props}>
        <rect x="4.5" y="5" width="15" height="14.5" rx="2.5" stroke={color} strokeWidth="1.8" />
        <path d="M9 5.2V19.2M14.8 5.2V19.2M4.8 10.2H19.2M4.8 14.8H19.2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M6.5 4.5H14.5L18.5 8.5V18A1.5 1.5 0 0 1 17 19.5H6.5A2 2 0 0 1 4.5 17.5V6.5A2 2 0 0 1 6.5 4.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 11H15.5M8 14.5H15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RefreshGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11A8 8 0 1 0 17.7 17M20 11V5M20 11H14"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CollabPage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${collabTheme.bgAlt} 0%, ${collabTheme.bg} 120px, ${collabTheme.bg} 100%)`,
        color: collabTheme.text,
      }}
    >
      <div style={{ padding: "16px clamp(14px, 3vw, 24px) 96px" }}>{children}</div>
    </div>
  );
}

export function CollabHeader(props: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  accent?: boolean;
  bottomRight?: ReactNode;
  version?: string;
  showRefresh?: boolean;
  onRefresh?: (() => void | Promise<void>) | undefined;
  refreshing?: boolean;
  lastRefreshAt?: Date | null;
}) {
  const {
    title,
    subtitle,
    right,
    bottomRight,
    version = appPackage.version,
    showRefresh = false,
    onRefresh,
    refreshing = false,
    lastRefreshAt = null,
  } = props;

  const lastRefreshLabel = lastRefreshAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(lastRefreshAt)
        .replace(",", " à")
    : "";

  const refreshButton = showRefresh ? (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      {lastRefreshLabel ? (
        <span style={{ fontSize: 11, color: "rgba(255,243,233,0.82)" }}>
          Maj. {lastRefreshLabel}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (refreshing) return;
          if (onRefresh) {
            void onRefresh();
            return;
          }
          if (typeof window !== "undefined") window.location.reload();
        }}
        aria-label="Actualiser la page"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          color: "#fff8f1",
          minHeight: 34,
          padding: "0 12px",
          fontSize: 12,
          fontWeight: 700,
          cursor: refreshing ? "wait" : "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        <RefreshGlyph color="#fff8f1" />
        {refreshing ? "Mise a jour..." : "Actualiser"}
      </button>
    </div>
  ) : null;

  return (
    <div
      style={{
        ...collabCardStyle({
          padding: 0,
          overflow: "hidden",
          marginBottom: 16,
          background: collabTheme.accent,
          borderColor: collabTheme.accent,
        }),
      }}
    >
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(255,246,240,0.9)", textTransform: "uppercase" }}>Epicerie · Villebon 2</div>
          {right}
        </div>
        <div style={{ ...collabSerifTitleStyle({ fontSize: 20, color: "#fffdf9", marginTop: 8 }) }}>{title}</div>
        {(subtitle || version || bottomRight) ? (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 220px" }}>
              {subtitle ? <div style={{ fontSize: 13, color: "rgba(255,248,241,0.92)" }}>{subtitle}</div> : null}
              {version ? (
                <div style={{ marginTop: subtitle ? 5 : 0, fontSize: 11, color: "rgba(255,243,233,0.76)" }}>
                  Version {version}
                </div>
              ) : null}
            </div>
            {bottomRight || refreshButton ? (
              <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {bottomRight}
                {refreshButton}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...collabCardStyle({ padding: "16px 14px" }), ...style }}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div style={{ ...collabSerifTitleStyle({ fontSize: 17, fontWeight: 700 }) }}>{children}</div>
      {right}
    </div>
  );
}

export function QuickTile({
  href,
  title,
  subtitle,
  tone = collabTheme.blue,
  badge,
  badgeLabel,
  icon = "planning",
}: {
  href: string;
  title: string;
  subtitle: string;
  tone?: string;
  badge?: ReactNode;
  badgeLabel?: string;
  icon?: "planning" | "absences" | "tg" | "infos" | "plateau";
}) {
  return (
    <Link
      href={href}
      style={{
        ...collabCardStyle({
          padding: "14px 14px 12px",
          display: "block",
          textDecoration: "none",
          color: "#ffffff",
          minHeight: 118,
          background: tone,
          borderColor: "transparent",
          position: "relative",
        }),
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center" }}>
        <CollabGlyph kind={icon} color="#ffffff" />
      </div>
      {badge ? (
        typeof badge === "string" || typeof badge === "number" ? (
          <span
            aria-label={badgeLabel}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              minWidth: 24,
              height: 24,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              padding: "0 6px",
              background: "#ffffff",
              color: tone,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {badge}
          </span>
        ) : (
          <div
            aria-label={badgeLabel}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-end",
              justifyContent: "flex-end",
              maxWidth: "52%",
            }}
          >
            {badge}
          </div>
        )
      ) : null}
      <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, fontFamily: collabTheme.titleFont }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4, color: "rgba(255,255,255,0.92)" }}>{subtitle}</div>
    </Link>
  );
}

export function StatusPill({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 700,
        color,
        background,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

const navItems: Array<{
  href: string;
  label: string;
  icon: "home" | "planning" | "absences" | "tg" | "infos" | "plateau";
}> = [
  { href: "/collab/home", label: "Accueil", icon: "home" },
  { href: "/collab/planning", label: "Planning", icon: "planning" },
  { href: "/collab/absences", label: "Absences", icon: "absences" },
  { href: "/collab/plan-tg", label: "Plan TG", icon: "tg" },
  { href: "/collab/plateau", label: "Plateau", icon: "plateau" },
  { href: "/collab/infos", label: "Infos", icon: "infos" },
];

function getAbsenceResponseSeenKey(profileKey: string) {
  return `epicerie-collab-absence-response-seen:${profileKey}`;
}

function getCollabInfosDocumentsSeenKey(profileKey: string) {
  return `epicerie-collab-infos-documents-seen:${profileKey}`;
}

function getAbsenceResponseTimestamp(row: Record<string, unknown>) {
  return String(row.updated_at ?? row.created_at ?? row.date_fin ?? "");
}

function getLatestInfosDocumentTimestamp(categories: Array<{ items?: Array<{ updatedAt?: string; createdAt?: string }> }>) {
  return categories
    .flatMap((category) => category.items ?? [])
    .map((item) => String(item.updatedAt ?? item.createdAt ?? ""))
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";
}

export function CollabBottomNav() {
  const pathname = usePathname();
  const [showAbsenceBadge, setShowAbsenceBadge] = useState(false);
  const [showInfosBadge, setShowInfosBadge] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCollabProfile()
      .then(async (profile) => {
        if (!profile) return;
        const profileKey = String(profile.employee_id ?? profile.id ?? profile.employees?.name ?? "collab");
        const storageKey = getAbsenceResponseSeenKey(profileKey);
        const rows = (await getMyAbsences()) as Array<Record<string, unknown>>;
        const respondedRows = rows.filter((row) => {
          const status = String(row.statut ?? "").toLowerCase();
          return status.includes("appr") || status.includes("refus") || status.includes("refuse");
        });
        const latestResponse = respondedRows.map(getAbsenceResponseTimestamp).filter(Boolean).sort().at(-1);

        if (!latestResponse) {
          if (!cancelled) setShowAbsenceBadge(false);
          return;
        }

        if (pathname === "/collab/absences") {
          window.localStorage.setItem(storageKey, latestResponse);
          if (!cancelled) setShowAbsenceBadge(false);
          return;
        }

        const seenResponse = window.localStorage.getItem(storageKey) ?? "";
        if (!cancelled) setShowAbsenceBadge(latestResponse > seenResponse);
      })
      .catch(() => {
        if (!cancelled) setShowAbsenceBadge(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    void getCollabProfile()
      .then(async (profile) => {
        if (!profile?.employee_id) return;
        const profileKey = String(profile.employee_id ?? profile.id ?? profile.employees?.name ?? "collab");
        const docsSeenKey = getCollabInfosDocumentsSeenKey(profileKey);
        const payload = await getCollabInfosFromSupabase(profile.employee_id);
        const latestDocumentTimestamp = getLatestInfosDocumentTimestamp(payload.categories);
        const seenDocumentsAt = window.localStorage.getItem(docsSeenKey) ?? "";
        const hasUnreadDocs = Boolean(latestDocumentTimestamp && latestDocumentTimestamp > seenDocumentsAt);
        const hasUnreadAnnouncements = payload.announcements.some((announcement) => !announcement.selfReceipt?.seenAt);

        if (pathname === "/collab/infos") {
          if (!cancelled) setShowInfosBadge(false);
          return;
        }

        if (!cancelled) {
          setShowInfosBadge(hasUnreadDocs || hasUnreadAnnouncements);
        }
      })
      .catch(() => {
        if (!cancelled) setShowInfosBadge(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        width: "min(760px, calc(100vw - 18px))",
        ...collabCardStyle({
          padding: "6px 6px 7px",
          display: "grid",
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          zIndex: 50,
        }),
      }}
    >
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              textAlign: "center",
              padding: "6px 2px 5px",
              color: active ? collabTheme.accent : "#a18f7e",
              fontWeight: active ? 700 : 600,
              fontSize: 10,
              position: "relative",
              borderBottom: active ? `2px solid ${collabTheme.accent}` : "2px solid transparent",
              display: "grid",
              justifyItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: active ? "rgba(210,0,24,0.08)" : "transparent",
              }}
            >
              <CollabGlyph kind={item.icon} color={active ? collabTheme.accent : "#a18f7e"} size={16} />
            </span>
            <span>{item.label}</span>
            {item.href === "/collab/absences" && showAbsenceBadge ? (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: "calc(50% - 18px)",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: collabTheme.accent,
                  boxShadow: "0 0 0 2px #ffffff",
                }}
              />
            ) : null}
            {item.href === "/collab/infos" && showInfosBadge ? (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: "calc(50% - 18px)",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#2563eb",
                  boxShadow: "0 0 0 2px #ffffff",
                }}
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

