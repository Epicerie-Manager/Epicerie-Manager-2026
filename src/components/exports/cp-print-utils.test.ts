import { describe, expect, it } from "vitest";
import type { AbsenceRequest } from "@/lib/absences-data";
import { getCpRequestsInPeriod, getWeeksInRange, parseManualCpPeriods } from "./cp-print-utils";

describe("CP export helpers", () => {
  it("builds weekly columns aligned on Mondays and ISO weeks", () => {
    expect(getWeeksInRange("2026-04-09", "2026-04-22")).toEqual([
      {
        key: "2026-04-06",
        weekNumber: 15,
        startIso: "2026-04-06",
        endIso: "2026-04-12",
        rangeLabel: "6 avr. - 12 avr.",
      },
      {
        key: "2026-04-13",
        weekNumber: 16,
        startIso: "2026-04-13",
        endIso: "2026-04-19",
        rangeLabel: "13 avr. - 19 avr.",
      },
      {
        key: "2026-04-20",
        weekNumber: 17,
        startIso: "2026-04-20",
        endIso: "2026-04-26",
        rangeLabel: "20 avr. - 26 avr.",
      },
    ]);
  });

  it("keeps only approved CP and unpaid leave inside the selected period", () => {
    const requests: AbsenceRequest[] = [
      { id: "1", employee: "FARIDA", type: "CP", startDate: "2026-04-10", endDate: "2026-04-14", status: "approuve" },
      { id: "2", employee: "TOUS", type: "CP", startDate: "2026-04-10", endDate: "2026-04-14", status: "approuve" },
      { id: "3", employee: "MASSIMO", type: "MAL", startDate: "2026-04-11", endDate: "2026-04-13", status: "approuve" },
      { id: "4", employee: "JEREMY", type: "CONGE_SANS_SOLDE", startDate: "2026-04-18", endDate: "2026-04-20", status: "approuve" },
      { id: "5", employee: "CECILE", type: "CP", startDate: "2026-04-21", endDate: "2026-04-22", status: "en_attente" },
    ];

    expect(getCpRequestsInPeriod(requests, "2026-04-09", "2026-04-20").map((item) => item.id)).toEqual(["1", "4"]);
  });

  it("parses manual periods and clips them to the selected print range", () => {
    expect(parseManualCpPeriods("10/04/2026 au 15/04/2026 ; 20/04/2026", "2026-04-13", "2026-04-20")).toEqual([
      {
        startIso: "2026-04-13",
        endIso: "2026-04-15",
        label: "13 avr. au 15 avr. 2026",
        days: 3,
      },
      {
        startIso: "2026-04-20",
        endIso: "2026-04-20",
        label: "20 avr. au 20 avr. 2026",
        days: 1,
      },
    ]);
  });
});
