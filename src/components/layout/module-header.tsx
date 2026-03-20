import type { ModuleKey } from "@/lib/theme";
import { colors, moduleThemes, typography } from "@/lib/theme";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";

type ModuleHeaderProps = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  kicker?: string;
};

export function ModuleHeader({
  moduleKey,
  title,
  description,
  kicker = "Module V1",
}: ModuleHeaderProps) {
  const theme = moduleThemes[moduleKey];

  return (
    <Card
      className="module-hero"
      style={{
        background: theme.gradient,
        borderColor: theme.medium,
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.02), inset 0 4px 0 rgba(255,255,255,0.6)",
      }}
    >
      <Kicker moduleKey={moduleKey}>{kicker}</Kicker>
      <h1
        style={{
          margin: "10px 0 10px",
          fontSize: `clamp(1.8rem, 4vw, ${typography.h1.size})`,
          fontWeight: typography.h1.weight,
          letterSpacing: typography.h1.letterSpacing,
          color: colors.textStrong,
          textDecoration: "underline",
          textDecorationColor: theme.medium,
          textUnderlineOffset: "8px",
          textDecorationThickness: "4px",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: "62rem",
          color: colors.muted,
          fontSize: typography.body.size,
          lineHeight: typography.body.lineHeight,
        }}
      >
        {description}
      </p>
    </Card>
  );
}
