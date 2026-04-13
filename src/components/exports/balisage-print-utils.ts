"use client";

import { type BalisageEmployeeStat } from "@/lib/balisage-data";
import {
  getBalisageDynamicStatus,
  getBalisageMonthLabel,
  getBalisageProgress,
  getBalisageStatusStyle,
  getCurrentBalisageMonthId,
  getPreviousBalisageMonthId,
} from "@/lib/balisage-metrics";

export type BalisagePrintStat = BalisageEmployeeStat & {
  actif: boolean;
  previousTotal: number | null;
  deltaFromPrevious: number | null;
};

export { getCurrentBalisageMonthId, getBalisageMonthLabel, getPreviousBalisageMonthId };
export const getDynamicStatus = getBalisageDynamicStatus;
export const getProgress = getBalisageProgress;
export const getStatusStyle = getBalisageStatusStyle;

export function sortBalisageStats(stats: BalisagePrintStat[]) {
  return [...stats].sort((a, b) => {
    if (a.actif !== b.actif) return a.actif ? -1 : 1;
    return b.total - a.total || a.name.localeCompare(b.name, "fr");
  });
}
