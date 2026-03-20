import { colors, radii, shadows, spacing } from "@/lib/theme";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: colors.card,
        border: `1px solid ${colors.line}`,
        borderRadius: radii.card,
        boxShadow: shadows.card,
        padding: spacing.cardPadding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
