import { radii } from "@/lib/theme";

type ProgressBarProps = {
  value: number;
  color: string;
  trackColor?: string;
};

export function ProgressBar({
  value,
  color,
  trackColor = "#ecf0f4",
}: ProgressBarProps) {
  return (
    <div
      style={{
        marginTop: 12,
        height: 10,
        borderRadius: radii.pill,
        background: trackColor,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(value, 100))}%`,
          height: "100%",
          borderRadius: radii.pill,
          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 58%, white))`,
        }}
      />
    </div>
  );
}
