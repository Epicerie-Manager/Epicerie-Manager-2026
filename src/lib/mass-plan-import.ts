"use client";

import type { MassElement } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID, PLAN_TITLE_BAR_HEIGHT } from "@/components/plan-rayon/mass-plan/mass-plan-types";

export type MassPlanImportMode = "append" | "replace";

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type BuildImportedElementsOptions = {
  sourceElements: MassElement[];
  existingElements: MassElement[];
  targetPlanId: string;
  mode: MassPlanImportMode;
  canvasW: number;
  canvasH: number;
};

function buildBounds(elements: MassElement[]): Bounds {
  const minX = Math.min(...elements.map((element) => element.x));
  const minY = Math.min(...elements.map((element) => element.y));
  const maxX = Math.max(...elements.map((element) => element.x + element.w));
  const maxY = Math.max(...elements.map((element) => element.y + element.h));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(GRID, maxX - minX),
    height: Math.max(GRID, maxY - minY),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeLocalId(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveAppendAnchor(existing: MassElement[], sourceBounds: Bounds, canvasW: number, canvasH: number) {
  const safeX = Math.max(0, canvasW - sourceBounds.width);
  const safeY = Math.max(PLAN_TITLE_BAR_HEIGHT, canvasH - sourceBounds.height);

  if (!existing.length) {
    return {
      x: clamp(GRID, 0, safeX),
      y: clamp(PLAN_TITLE_BAR_HEIGHT + GRID, PLAN_TITLE_BAR_HEIGHT, safeY),
    };
  }

  const existingBounds = buildBounds(existing);
  const rightAnchor = {
    x: existingBounds.maxX + GRID * 2,
    y: PLAN_TITLE_BAR_HEIGHT + GRID,
  };
  if (rightAnchor.x + sourceBounds.width <= canvasW) {
    return {
      x: clamp(rightAnchor.x, 0, safeX),
      y: clamp(rightAnchor.y, PLAN_TITLE_BAR_HEIGHT, safeY),
    };
  }

  const belowAnchor = {
    x: GRID,
    y: existingBounds.maxY + GRID * 2,
  };
  if (belowAnchor.y + sourceBounds.height <= canvasH) {
    return {
      x: clamp(belowAnchor.x, 0, safeX),
      y: clamp(belowAnchor.y, PLAN_TITLE_BAR_HEIGHT, safeY),
    };
  }

  return {
    x: clamp(GRID, 0, safeX),
    y: clamp(PLAN_TITLE_BAR_HEIGHT + GRID, PLAN_TITLE_BAR_HEIGHT, safeY),
  };
}

export function buildImportedElements({
  sourceElements,
  existingElements,
  targetPlanId,
  mode,
  canvasW,
  canvasH,
}: BuildImportedElementsOptions): MassElement[] {
  if (!sourceElements.length) return mode === "replace" ? [] : existingElements.map((element) => ({ ...element }));

  const sourceBounds = buildBounds(sourceElements);
  const anchor = mode === "append"
    ? resolveAppendAnchor(existingElements, sourceBounds, canvasW, canvasH)
    : { x: 0, y: PLAN_TITLE_BAR_HEIGHT };

  const translateX = mode === "append" ? anchor.x - sourceBounds.minX : 0;
  const translateY = mode === "append" ? anchor.y - sourceBounds.minY : 0;
  const startingZIndex =
    mode === "append"
      ? Math.max(0, ...existingElements.map((element) => element.z_index)) + 1
      : 1;

  const imported = sourceElements.map((element, index) => ({
    ...element,
    id: makeLocalId(index),
    plan_id: targetPlanId,
    x: clamp(element.x + translateX, 0, Math.max(0, canvasW - element.w)),
    y: clamp(
      element.y + translateY,
      PLAN_TITLE_BAR_HEIGHT,
      Math.max(PLAN_TITLE_BAR_HEIGHT, canvasH - element.h),
    ),
    z_index: startingZIndex + index,
  }));

  return mode === "append" ? [...existingElements, ...imported] : imported;
}
