import type { ModuleKey } from "@/lib/theme";
import { colors, moduleThemes, radii, spacing } from "@/lib/theme";
import Link from "next/link";

type NavCardProps = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  href?: string;
};

export function NavCard({ moduleKey, title, description, href }: NavCardProps) {
  const theme = moduleThemes[moduleKey];

  const content = (
    <div
      style={{
        border: `1px solid ${colors.line}`,
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: radii.cardSm,
        padding: `${spacing.itemGap} ${spacing.itemGap}`,
        background: `linear-gradient(180deg, ${theme.light}, #f8fafc)`,
      }}
    >
      <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
      <span style={{ color: colors.muted, fontSize: 13 }}>{description}</span>
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
