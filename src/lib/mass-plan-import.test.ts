import { describe, expect, it } from "vitest";
import type { MassElement } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID, PLAN_TITLE_BAR_HEIGHT } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { buildImportedElements } from "@/lib/mass-plan-import";

function makeElement(overrides: Partial<MassElement> = {}): MassElement {
  return {
    id: overrides.id ?? "elt-1",
    plan_id: overrides.plan_id ?? "plan-source",
    rayon_plan_id: overrides.rayon_plan_id ?? null,
    element_type: overrides.element_type ?? "rayon",
    label: overrides.label ?? "Test",
    x: overrides.x ?? 0,
    y: overrides.y ?? PLAN_TITLE_BAR_HEIGHT + GRID,
    w: overrides.w ?? GRID,
    h: overrides.h ?? GRID * 4,
    color: overrides.color ?? "#0a4f98",
    rotated: overrides.rotated ?? false,
    z_index: overrides.z_index ?? 1,
    rayon_name: overrides.rayon_name,
    rayon_color: overrides.rayon_color,
    rayon_elem_count: overrides.rayon_elem_count,
    rayon_facing_url: overrides.rayon_facing_url ?? null,
    rayon_universe_name: overrides.rayon_universe_name,
  };
}

describe("buildImportedElements", () => {
  it("replaces the target plan with cloned source elements", () => {
    const result = buildImportedElements({
      sourceElements: [makeElement({ id: "source-a", x: 200, y: 180, z_index: 3 })],
      existingElements: [makeElement({ id: "existing-a", plan_id: "plan-target" })],
      targetPlanId: "plan-target",
      mode: "replace",
      canvasW: 1200,
      canvasH: 1200,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).not.toBe("source-a");
    expect(result[0]?.plan_id).toBe("plan-target");
    expect(result[0]?.x).toBe(200);
    expect(result[0]?.y).toBe(180);
    expect(result[0]?.z_index).toBe(1);
  });

  it("appends imported elements to the right of the existing block when space is available", () => {
    const existing = [makeElement({ id: "existing-a", plan_id: "plan-target", x: GRID, y: PLAN_TITLE_BAR_HEIGHT + GRID, w: GRID * 3, h: GRID * 2, z_index: 4 })];
    const source = [
      makeElement({ id: "source-a", x: 80, y: 120, w: GRID * 2, h: GRID * 2, z_index: 1 }),
      makeElement({ id: "source-b", x: 160, y: 120, w: GRID * 2, h: GRID * 2, z_index: 2 }),
    ];

    const result = buildImportedElements({
      sourceElements: source,
      existingElements: existing,
      targetPlanId: "plan-target",
      mode: "append",
      canvasW: 1200,
      canvasH: 1200,
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("existing-a");
    expect(result[1]?.plan_id).toBe("plan-target");
    expect(result[1]?.x).toBe(existing[0]!.x + existing[0]!.w + GRID * 2);
    expect(result[1]?.y).toBe(PLAN_TITLE_BAR_HEIGHT + GRID);
    expect(result[2]?.x - result[1]!.x).toBe(source[1]!.x - source[0]!.x);
    expect(result[1]?.z_index).toBe(5);
    expect(result[2]?.z_index).toBe(6);
  });
});
