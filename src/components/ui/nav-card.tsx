import type { ModuleKey } from "@/lib/theme";
import { colors, moduleThemes, radii, spacing } from "@/lib/theme";

type NavCardProps = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
};

export function NavCard({ moduleKey, title, description }: NavCardProps) {
  const theme = moduleThemes[moduleKey];

  return (
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
}
