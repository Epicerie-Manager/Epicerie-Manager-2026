import type { ModuleKey } from "@/lib/theme";
import { colors, moduleThemes, typography } from "@/lib/theme";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";

type ModuleHeaderProps = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  kicker?: string;
  compact?: boolean;
};

function HeaderIcon({ moduleKey, color }: { moduleKey: ModuleKey; color: string }) {
  const style: React.CSSProperties = {
    width: "16px",
    height: "16px",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (moduleKey === "planning") {
    return <svg viewBox="0 0 24 24" style={style}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  }
  if (moduleKey === "plantg") {
    return <svg viewBox="0 0 24 24" style={style}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
  }
  if (moduleKey === "plateau") {
    return <svg viewBox="0 0 24 24" style={style}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>;
  }
  if (moduleKey === "balisage") {
    return <svg viewBox="0 0 24 24" style={style}><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
  }
  if (moduleKey === "absences") {
    return <svg viewBox="0 0 24 24" style={style}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  }
  if (moduleKey === "infos") {
    return <svg viewBox="0 0 24 24" style={style}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
  }
  if (moduleKey === "rh") {
    return <svg viewBox="0 0 24 24" style={style}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.8" /></svg>;
  }
  if (moduleKey === "suivi") {
    return <svg viewBox="0 0 24 24" style={style}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
  }
  return <svg viewBox="0 0 24 24" style={style}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}

export function ModuleHeader({
  moduleKey,
  title,
  description,
  kicker = "Vue manager",
  compact = false,
}: ModuleHeaderProps) {
  const theme = moduleThemes[moduleKey];

  return (
    <Card
      className="module-hero"
      style={{
        background: theme.gradient,
        borderColor: theme.medium,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 18px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
        padding: compact ? "13px 16px" : "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            aria-hidden
            style={{
              width: compact ? "32px" : "36px",
              height: compact ? "32px" : "36px",
              borderRadius: "12px",
              background: theme.iconGradient,
              border: `1px solid ${theme.medium}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <HeaderIcon moduleKey={moduleKey} color={theme.color} />
          </span>
          <Kicker moduleKey={moduleKey}>{kicker}</Kicker>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: theme.dark,
            background: `${theme.medium}`,
            border: `1px solid ${theme.color}22`,
            borderRadius: "999px",
            padding: "3px 8px",
          }}
        >
          {moduleKey.toUpperCase()}
        </span>
      </div>
      <h1
        style={{
          margin: compact ? "6px 0 4px" : "8px 0 6px",
          fontSize: compact ? "22px" : "26px",
          fontWeight: typography.h1.weight,
          letterSpacing: "-0.04em",
          color: colors.textStrong,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: "62rem",
          color: colors.muted,
          fontSize: compact ? "12px" : "13px",
          lineHeight: typography.body.lineHeight,
        }}
      >
        {description}
      </p>
    </Card>
  );
}
