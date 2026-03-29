export type PresenceThresholdLevel = "ok" | "warning" | "critical";

export type PresenceThresholds = {
  warningThreshold: number;
  criticalThreshold: number;
};

export const defaultPresenceThresholds: PresenceThresholds = {
  warningThreshold: 12,
  criticalThreshold: 10,
};

export function normalizePresenceThresholds(
  warningThresholdInput: number,
  criticalThresholdInput: number,
): PresenceThresholds {
  return {
    warningThreshold: Math.max(warningThresholdInput, criticalThresholdInput),
    criticalThreshold: Math.min(warningThresholdInput, criticalThresholdInput),
  };
}

export function getPresenceThresholdLevel(
  present: number,
  thresholds: PresenceThresholds,
): PresenceThresholdLevel {
  if (present < thresholds.criticalThreshold) return "critical";
  if (present < thresholds.warningThreshold) return "warning";
  return "ok";
}
