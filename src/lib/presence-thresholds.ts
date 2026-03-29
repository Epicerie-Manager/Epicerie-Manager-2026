export type PresenceThresholdLevel = "ok" | "warning" | "critical";

export type PresenceCounts = {
  morning: number;
  afternoon: number;
};

export type PresenceThresholds = {
  warningMorning: number;
  criticalMorning: number;
  warningAfternoon: number;
  criticalAfternoon: number;
};

export const defaultPresenceThresholds: PresenceThresholds = {
  warningMorning: 12,
  criticalMorning: 10,
  warningAfternoon: 2,
  criticalAfternoon: 1,
};

function normalizeThresholdValue(value: number, fallback: number) {
  const nextValue = Number(value);
  if (Number.isNaN(nextValue)) return fallback;
  return Math.max(0, Math.round(nextValue));
}

function normalizeThresholdPair(warningInput: number, criticalInput: number) {
  const warning = normalizeThresholdValue(warningInput, 0);
  const critical = normalizeThresholdValue(criticalInput, 0);
  return {
    warning: Math.max(warning, critical),
    critical: Math.min(warning, critical),
  };
}

export function normalizePresenceThresholds(
  input: Partial<PresenceThresholds> | PresenceThresholds,
): PresenceThresholds {
  const morning = normalizeThresholdPair(
    input.warningMorning ?? defaultPresenceThresholds.warningMorning,
    input.criticalMorning ?? defaultPresenceThresholds.criticalMorning,
  );
  const afternoon = normalizeThresholdPair(
    input.warningAfternoon ?? defaultPresenceThresholds.warningAfternoon,
    input.criticalAfternoon ?? defaultPresenceThresholds.criticalAfternoon,
  );

  return {
    warningMorning: morning.warning,
    criticalMorning: morning.critical,
    warningAfternoon: afternoon.warning,
    criticalAfternoon: afternoon.critical,
  };
}

export function getPresenceCountLevel(
  count: number,
  warningThreshold: number,
  criticalThreshold: number,
): PresenceThresholdLevel {
  if (count < criticalThreshold) return "critical";
  if (count < warningThreshold) return "warning";
  return "ok";
}

export function getPresenceThresholdLevel(
  counts: PresenceCounts,
  thresholds: PresenceThresholds,
): PresenceThresholdLevel {
  const normalized = normalizePresenceThresholds(thresholds);
  const morningLevel = getPresenceCountLevel(
    counts.morning,
    normalized.warningMorning,
    normalized.criticalMorning,
  );
  const afternoonLevel = getPresenceCountLevel(
    counts.afternoon,
    normalized.warningAfternoon,
    normalized.criticalAfternoon,
  );

  if (morningLevel === "critical" || afternoonLevel === "critical") return "critical";
  if (morningLevel === "warning" || afternoonLevel === "warning") return "warning";
  return "ok";
}

export function formatPresenceThresholdSummary(thresholds: PresenceThresholds) {
  const normalized = normalizePresenceThresholds(thresholds);
  return `matin < ${normalized.warningMorning} / ${normalized.criticalMorning} · après-midi < ${normalized.warningAfternoon} / ${normalized.criticalAfternoon}`;
}
