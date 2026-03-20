"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, getThemeByPathname, moduleThemes, shadows } from "@/lib/theme";

type AppShellProps = {
  version: string;
  children: React.ReactNode;
};

type ModuleNavItem = {
  id: "dashboard" | "planning" | "plantg" | "plateau" | "balisage";
  label: string;
  desc: string;
  href: string;
};

const moduleItems: ModuleNavItem[] = [
  { id: "dashboard", label: "Dashboard", desc: "Vue d'ensemble", href: "/" },
  { id: "planning", label: "Planning", desc: "Horaires et presences", href: "/planning" },
  { id: "plantg", label: "Plan TG", desc: "Tetes de gondole", href: "/plan-tg" },
  { id: "plateau", label: "Plateaux", desc: "Implantations terrain", href: "/plan-plateau" },
  { id: "balisage", label: "Balisage", desc: "Controle etiquetage", href: "/stats" },
];

const iconStyle = {
  width: "18px",
  height: "18px",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  planning: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  plantg: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  plateau: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  balisage: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

function getTodayLabel() {
  const now = new Date();
  return now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AppShell({ version, children }: AppShellProps) {
  const pathname = usePathname();
  const activeId = getThemeByPathname(pathname) as ModuleNavItem["id"];
  const activeTheme = moduleThemes[activeId];
  const activeModule = moduleItems.find((item) => item.id === activeId) ?? moduleItems[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bgGradient,
        color: colors.text,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226,232,240,0.6)",
          boxShadow: shadows.subtle,
        }}
      >
        <div
          style={{
            maxWidth: "1580px",
            margin: "0 auto",
            padding: "14px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: activeTheme.iconGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: activeTheme.color,
                boxShadow: `0 2px 8px ${activeTheme.color}20`,
              }}
            >
              {ICONS[activeId]}
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: activeTheme.color,
                  textTransform: "uppercase",
                }}
              >
                Epicerie Villebon 2
              </div>
              <h1
                style={{
                  margin: "1px 0 0",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: colors.textStrong,
                }}
              >
                {activeModule.label}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "10px",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                fontSize: "12px",
                fontWeight: 600,
                color: colors.muted,
              }}
            >
              {getTodayLabel()}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 14px",
                borderRadius: "10px",
                background: activeTheme.light,
                border: `1px solid ${activeTheme.color}26`,
                fontSize: "12px",
                fontWeight: 700,
                color: activeTheme.dark,
              }}
            >
              <span style={{ color: activeTheme.color, display: "flex" }}>{ICONS[activeId]}</span>
              {activeModule.desc}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: "999px",
                background: activeTheme.medium,
                color: activeTheme.dark,
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              v{version}
            </span>
          </div>
        </div>

        <nav
          style={{
            maxWidth: "1580px",
            margin: "0 auto",
            display: "flex",
            gap: "4px",
            padding: "12px 24px 0",
            overflowX: "auto",
          }}
          aria-label="Navigation modules"
        >
          {moduleItems.map((moduleItem) => {
            const selected = moduleItem.id === activeId;
            const theme = moduleThemes[moduleItem.id];

            return (
              <Link
                key={moduleItem.id}
                href={moduleItem.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "9px 16px",
                  borderRadius: "12px 12px 0 0",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  background: selected ? colors.cardSolid : "transparent",
                  borderBottom: selected ? `2px solid ${theme.color}` : "2px solid transparent",
                  boxShadow: selected ? "0 -1px 4px rgba(0,0,0,0.03)" : "none",
                  color: selected ? theme.color : colors.muted,
                }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: selected
                      ? theme.iconGradient
                      : "linear-gradient(135deg, #f1f5f9, #e8ecf1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: selected ? theme.color : colors.light,
                  }}
                >
                  {ICONS[moduleItem.id]}
                </span>
                <span style={{ fontSize: "13px", fontWeight: selected ? 700 : 500 }}>
                  {moduleItem.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: "1580px", margin: "0 auto", padding: "16px 24px 24px" }}>
        {children}
      </main>
    </div>
  );
}
