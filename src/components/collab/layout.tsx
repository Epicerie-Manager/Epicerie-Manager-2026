"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collabCardStyle, collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { getMyAbsences } from "@/lib/collab-data";

function CollabGlyph({ kind, color = "currentColor", size = 18 }: { kind: "planning" | "absences" | "tg" | "infos"; color?: string; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };

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

  return (
    <svg {...props}>
      <path d="M6.5 4.5H14.5L18.5 8.5V18A1.5 1.5 0 0 1 17 19.5H6.5A2 2 0 0 1 4.5 17.5V6.5A2 2 0 0 1 6.5 4.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 11H15.5M8 14.5H15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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
      <div style={{ padding: "16px 14px 96px" }}>{children}</div>
    </div>
  );
}

export function CollabHeader(props: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  accent?: boolean;
}) {
  const { title, subtitle, right } = props;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(255,246,240,0.9)", textTransform: "uppercase" }}>Epicerie · Villebon 2</div>
          {right}
        </div>
        <div style={{ ...collabSerifTitleStyle({ fontSize: 20, color: "#fffdf9", marginTop: 8 }) }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,248,241,0.92)" }}>{subtitle}</div> : null}
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
  icon = "planning",
}: {
  href: string;
  title: string;
  subtitle: string;
  tone?: string;
  badge?: number | string | null;
  icon?: "planning" | "absences" | "tg" | "infos";
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
        <span
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

const navItems = [
  { href: "/collab/home", label: "Accueil" },
  { href: "/collab/planning", label: "Planning" },
  { href: "/collab/absences", label: "Absences" },
  { href: "/collab/more", label: "Plus" },
];

function getAbsenceResponseSeenKey(profileKey: string) {
  return `epicerie-collab-absence-response-seen:${profileKey}`;
}

function getAbsenceResponseTimestamp(row: Record<string, unknown>) {
  return String(row.updated_at ?? row.created_at ?? row.date_fin ?? "");
}

export function CollabBottomNav() {
  const pathname = usePathname();
  const [showAbsenceBadge, setShowAbsenceBadge] = useState(false);

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

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        width: "min(398px, calc(100vw - 22px))",
        ...collabCardStyle({
          padding: "8px 10px 9px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
              padding: "8px 4px 6px",
              color: active ? collabTheme.accent : "#a18f7e",
              fontWeight: active ? 700 : 600,
              fontSize: 12,
              position: "relative",
              borderBottom: active ? `2px solid ${collabTheme.accent}` : "2px solid transparent",
            }}
          >
            {item.label}
            {item.href === "/collab/absences" && showAbsenceBadge ? (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 12,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: collabTheme.accent,
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
