import type { ModuleKey } from "@/lib/theme";
import { colors, moduleThemes, radii, spacing } from "@/lib/theme";
import Link from "next/link";

type NavCardProps = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function NavCard({
  moduleKey,
  title,
  description,
  icon,
  href,
  className,
  style,
}: NavCardProps) {
  const theme = moduleThemes[moduleKey];

  const content = (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        border: `1px solid ${colors.line}`,
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: radii.cardSm,
        padding: `${spacing.itemGap} ${spacing.itemGap}`,
        background: `linear-gradient(180deg, ${theme.light}, #f8fafc)`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
    >
      {icon ? (
        <div
          aria-hidden
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "12px",
            background: theme.iconGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.color,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              width: "14px",
              height: "14px",
            }}
          >
            {icon}
          </span>
        </div>
      ) : null}
      <div style={{ minWidth: 0 }}>
        <strong
          style={{
            display: "block",
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </strong>
        <span
          style={{
            color: colors.muted,
            fontSize: 13,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} style={{ display: "block", textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function NavCardGrid({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        marginTop: "4px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
