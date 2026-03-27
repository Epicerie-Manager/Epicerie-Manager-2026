import { shadows } from "@/lib/theme";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hero?: boolean;
  static?: boolean;
  onClick?: () => void;
};

const baseStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(210,222,234,0.6)",
  borderRadius: "20px",
  padding: "20px 22px",
  boxShadow: shadows.card,
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
  position: "relative",
  overflow: "hidden",
};

export function Card({
  children,
  className,
  style,
  hero = false,
  static: isStatic = false,
  onClick,
}: CardProps) {
  const resolvedStyle: React.CSSProperties = {
    ...baseStyle,
    ...(hero ? { background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)" } : {}),
    ...(onClick ? { cursor: "pointer" } : {}),
    ...(isStatic ? { transition: "none" } : {}),
    ...style,
  };

  return (
    <div
      className={className}
      style={resolvedStyle}
      onClick={onClick}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
