"use client";

import type { AbsenceRequest } from "@/lib/absences-data";

export type CpWeekColumn = {
  key: string;
  weekNumber: number;
  startIso: string;
  endIso: string;
  rangeLabel: string;
};

export type CpEmployeeSummary = {
  employee: string;
  periods: {
    type: AbsenceRequest["type"];
    startIso: string;
    endIso: string;
    label: string;
    days: number;
  }[];
};

export type CpManualPeriod = {
  startIso: string;
  endIso: string;
  label: string;
  days: number;
};

const MONTHS_SHORT = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];

export function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function getMonday(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getIsoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDayMonth(date: Date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatPeriodLabel(startIso: string, endIso: string) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  return `${formatDayMonth(start)} au ${formatDayMonth(end)} ${end.getFullYear()}`;
}

export function getWeeksInRange(startIso: string, endIso: string): CpWeekColumn[] {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const firstMonday = getMonday(start);
  const columns: CpWeekColumn[] = [];

  for (let current = new Date(firstMonday); current <= end; current = addDays(current, 7)) {
    const weekStart = new Date(current);
    const weekEnd = addDays(weekStart, 6);
    columns.push({
      key: formatIsoDate(weekStart),
      weekNumber: getIsoWeek(weekStart),
      startIso: formatIsoDate(weekStart),
      endIso: formatIsoDate(weekEnd),
      rangeLabel: `${formatDayMonth(weekStart)} - ${formatDayMonth(weekEnd)}`,
    });
  }

  return columns;
}

export function shiftPeriodByWeeks(startIso: string, endIso: string, deltaWeeks: number) {
  const start = addDays(parseIsoDate(startIso), deltaWeeks * 7);
  const end = addDays(parseIsoDate(endIso), deltaWeeks * 7);
  return {
    startIso: formatIsoDate(start),
    endIso: formatIsoDate(end),
  };
}

export function getCpRequestsInPeriod(requests: AbsenceRequest[], startIso: string, endIso: string) {
  return requests.filter((request) => {
    if (request.status !== "approuve") return false;
    if (!["CP", "CONGE_SANS_SOLDE"].includes(request.type)) return false;
    if (request.employee === "TOUS") return false;
    return !(request.endDate < startIso || request.startDate > endIso);
  });
}

export function getOverlapRange(startA: string, endA: string, startB: string, endB: string) {
  const start = startA > startB ? startA : startB;
  const end = endA < endB ? endA : endB;
  if (end < start) return null;
  return { startIso: start, endIso: end };
}

export function countDaysExcludingSundaysInRange(startIso: string, endIso: string) {
  let count = 0;
  for (let current = parseIsoDate(startIso); formatIsoDate(current) <= endIso; current = addDays(current, 1)) {
    if (current.getDay() !== 0) count += 1;
  }
  return count;
}

export function buildEmployeeCpSummaries(requests: AbsenceRequest[], startIso: string, endIso: string): CpEmployeeSummary[] {
  const byEmployee = new Map<string, CpEmployeeSummary["periods"]>();

  requests.forEach((request) => {
    const overlap = getOverlapRange(request.startDate, request.endDate, startIso, endIso);
    if (!overlap) return;
    const periods = byEmployee.get(request.employee) ?? [];
    periods.push({
      type: request.type,
      startIso: overlap.startIso,
      endIso: overlap.endIso,
      label: formatPeriodLabel(overlap.startIso, overlap.endIso),
      days: countDaysExcludingSundaysInRange(overlap.startIso, overlap.endIso),
    });
    byEmployee.set(request.employee, periods);
  });

  return Array.from(byEmployee.entries())
    .map(([employee, periods]) => ({
      employee,
      periods: periods.sort((left, right) => left.startIso.localeCompare(right.startIso)),
    }))
    .sort((left, right) => left.employee.localeCompare(right.employee, "fr"));
}

function parseFrenchDateToIso(value: string) {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function parseManualCpPeriods(rawValue: string, selectedStartIso?: string, selectedEndIso?: string): CpManualPeriod[] {
  const text = String(rawValue ?? "").trim();
  if (!text) return [];

  const rangePattern =
    /(\d{2}\/\d{2}\/\d{4})\s*(?:au|a|-|→)\s*(\d{2}\/\d{2}\/\d{4})|(\d{2}\/\d{2}\/\d{4})/gi;
  const periods: CpManualPeriod[] = [];

  for (const match of text.matchAll(rangePattern)) {
    const singleDate = match[3];
    const startIso = parseFrenchDateToIso(match[1] || singleDate);
    const endIso = parseFrenchDateToIso(match[2] || singleDate);
    if (!startIso || !endIso) continue;
    const normalizedStart = startIso <= endIso ? startIso : endIso;
    const normalizedEnd = startIso <= endIso ? endIso : startIso;
    const overlap =
      selectedStartIso && selectedEndIso
        ? getOverlapRange(normalizedStart, normalizedEnd, selectedStartIso, selectedEndIso)
        : { startIso: normalizedStart, endIso: normalizedEnd };
    if (!overlap) continue;
    periods.push({
      startIso: overlap.startIso,
      endIso: overlap.endIso,
      label: formatPeriodLabel(overlap.startIso, overlap.endIso),
      days: countDaysExcludingSundaysInRange(overlap.startIso, overlap.endIso),
    });
  }

  return periods.sort((left, right) => left.startIso.localeCompare(right.startIso));
}

export function serializeManualCpPeriods(periods: CpManualPeriod[]) {
  return periods.map((period) => `${period.startIso}:${period.endIso}`).join("|");
}

export function parseSerializedManualCpPeriods(rawValue: string, selectedStartIso?: string, selectedEndIso?: string): CpManualPeriod[] {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return [];

  return raw
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [rawStart, rawEnd] = chunk.split(":");
      const startIso = String(rawStart ?? "").trim();
      const endIso = String(rawEnd ?? rawStart ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
        return null;
      }
      const normalizedStart = startIso <= endIso ? startIso : endIso;
      const normalizedEnd = startIso <= endIso ? endIso : startIso;
      const overlap =
        selectedStartIso && selectedEndIso
          ? getOverlapRange(normalizedStart, normalizedEnd, selectedStartIso, selectedEndIso)
          : { startIso: normalizedStart, endIso: normalizedEnd };
      if (!overlap) return null;
      return {
        startIso: overlap.startIso,
        endIso: overlap.endIso,
        label: formatPeriodLabel(overlap.startIso, overlap.endIso),
        days: countDaysExcludingSundaysInRange(overlap.startIso, overlap.endIso),
      };
    })
    .filter((period): period is CpManualPeriod => period !== null)
    .sort((left, right) => left.startIso.localeCompare(right.startIso));
}
