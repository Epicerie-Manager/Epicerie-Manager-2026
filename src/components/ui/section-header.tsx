import type { ModuleKey } from "@/lib/theme";
import { colors, typography } from "@/lib/theme";
import { Kicker } from "./kicker";

type SectionHeaderProps = {
  moduleKey: ModuleKey;
  kicker: string;
  title: string;
  description?: string;
};

export function SectionHeader({
  moduleKey,
  kicker,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Kicker moduleKey={moduleKey}>{kicker}</Kicker>
      <div>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: typography.h2.size,
            fontWeight: typography.h2.weight,
            letterSpacing: typography.h2.letterSpacing,
            color: colors.textStrong,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p style={{ margin: 0, color: colors.muted, fontSize: typography.muted.size }}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
