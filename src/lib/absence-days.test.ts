import { describe, expect, it } from "vitest";
import { countCalendarDaysInclusive, countDaysExcludingSundays } from "./absence-days";

describe("absence day helpers", () => {
  it("counts a full week without charging the Sunday", () => {
    expect(countDaysExcludingSundays("2026-04-06", "2026-04-12")).toBe(6);
    expect(countCalendarDaysInclusive("2026-04-06", "2026-04-12")).toBe(7);
  });

  it("returns zero for invalid or reversed periods", () => {
    expect(countDaysExcludingSundays("2026-04-12", "2026-04-06")).toBe(0);
    expect(countCalendarDaysInclusive("", "2026-04-12")).toBe(0);
  });
});
