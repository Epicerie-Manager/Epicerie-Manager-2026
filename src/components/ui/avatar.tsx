import { moduleThemes } from "@/lib/theme";

type AvatarProps = {
  name: string;
  photo?: string | null;
  size?: number;
  active?: boolean;
};

export function Avatar({ name, photo, size = 42, active = true }: AvatarProps) {
  const teal = moduleThemes.rh;
  const radius = size > 36 ? 14 : 10;

  if (photo) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
          flexShrink: 0,
          border: `2px solid ${active ? `${teal.color}30` : "#e2e8f0"}`,
          background: "#fff",
        }}
      >
        <img
          src={photo}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: active
          ? teal.iconGradient
          : "linear-gradient(135deg,#f1f5f9,#e8ecf1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.33),
        fontWeight: 800,
        color: active ? teal.color : "#94a3b8",
        flexShrink: 0,
      }}
    >
      {name.substring(0, 2)}
    </div>
  );
}
