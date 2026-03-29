"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collabCardStyle, collabTheme } from "@/components/collab/theme";

export function CollabPage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(212,5,17,0.08), transparent 24%), linear-gradient(180deg, #faf8f5 0%, #f6f0e8 100%)",
        color: collabTheme.text,
      }}
    >
      <div style={{ padding: "20px 16px 96px" }}>{children}</div>
    </div>
  );
}

export function CollabHeader({
  title,
  subtitle,
  accent = true,
}: {
  title: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        ...collabCardStyle({
          padding: "20px 18px",
          marginBottom: 16,
          background: accent ? "linear-gradient(135deg, #D40511, #9f0f18)" : collabTheme.card,
          color: accent ? "#fff8f1" : collabTheme.text,
        }),
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.45, color: accent ? "rgba(255,248,241,0.86)" : collabTheme.muted }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export function SectionCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...collabCardStyle({ padding: "18px 16px" }), ...style }}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{children}</div>
      {right}
    </div>
  );
}

export function QuickTile({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      style={{
        ...collabCardStyle({
          padding: "16px 14px",
          display: "block",
          textDecoration: "none",
          color: collabTheme.text,
          minHeight: 112,
        }),
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: collabTheme.muted }}>{subtitle}</div>
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
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 700,
        color,
        background,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
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

export function CollabBottomNav() {
  const pathname = usePathname();
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        width: "min(398px, calc(100vw - 24px))",
        ...collabCardStyle({
          padding: "10px 8px",
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
              padding: "8px 4px",
              borderRadius: 16,
              color: active ? collabTheme.accent : collabTheme.muted,
              background: active ? collabTheme.accentSoft : "transparent",
              fontWeight: active ? 700 : 600,
              fontSize: 12,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
