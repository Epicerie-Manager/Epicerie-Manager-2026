"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { useUserRole } from "@/lib/use-user-role";
import { buildImportedElements, type MassPlanImportMode } from "@/lib/mass-plan-import";
import { createFacingSignedUrl, createMassPlan, deleteMassPlan, loadMassPlanElements, loadMassPlans, loadRayonLibrary, saveMassPlanElements, updateMassPlanDimensions } from "@/lib/mass-plan-db";
import { MassPlanCanvas } from "@/components/plan-rayon/mass-plan/mass-plan-canvas";
import { MassPlanInspector } from "@/components/plan-rayon/mass-plan/mass-plan-inspector";
import { DeletePlanModal, ImportPlanModal, NewPlanModal } from "@/components/plan-rayon/mass-plan/mass-plan-modals";
import { MassPlanSidebar } from "@/components/plan-rayon/mass-plan/mass-plan-sidebar";
import { PlanRayonConfirmModal } from "@/components/plan-rayon/confirm-modal";
import type { DragLibraryPayload, MassElement, MassPlan, RayonLibItem } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID, PLAN_TITLE_BAR_HEIGHT } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { getDefaultTextModuleStyle } from "@/lib/mass-plan-text";

const DEFAULT_PLAN_WIDTH = 1200;
const DEFAULT_PLAN_HEIGHT = 1200;
const MASS_PLAN_DIRTY_STORAGE_KEY = "plan-rayon-mass-plan-dirty";

function buildDefaultSize(payload: DragLibraryPayload) {
  if (payload.kind === "structure") {
    if (payload.size) return payload.size;
    if (payload.elementType === "alley-h") return { w: GRID * 4, h: GRID };
    if (payload.elementType === "alley-v") return { w: GRID, h: GRID * 4 };
    if (payload.elementType === "text") return { w: GRID * 4, h: GRID * 2 };
    return { w: GRID * 2, h: GRID };
  }
  const rows = Math.max(2, payload.rayon.elem_count);
  return { w: GRID, h: rows * GRID };
}

export function MassPlanView() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, loading: roleLoading, canWriteModule } = useUserRole();
  const canWrite = canWriteModule("plan_rayon");
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const [plans, setPlans] = useState<MassPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [elements, setElements] = useState<MassElement[]>([]);
  const [library, setLibrary] = useState<RayonLibItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [importPlanOpen, setImportPlanOpen] = useState(false);
  const [importSourcePlanId, setImportSourcePlanId] = useState("");
  const [importMode, setImportMode] = useState<MassPlanImportMode>("append");
  const [newPlanDraft, setNewPlanDraft] = useState({ name: "Plan global", width: DEFAULT_PLAN_WIDTH, height: DEFAULT_PLAN_HEIGHT });
  const [canvasDraft, setCanvasDraft] = useState({ width: String(DEFAULT_PLAN_WIDTH), height: String(DEFAULT_PLAN_HEIGHT) });
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState<MassElement[][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingSwitchPlanId, setPendingSwitchPlanId] = useState<string | null>(null);
  const signedUrlCache = useRef(new Map<string, string>());
  const resizeDebounceRef = useRef<number | null>(null);

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? null;
  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.has(element.id)),
    [elements, selectedIds],
  );
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] ?? null : null;
  const importablePlans = plans.filter((plan) => plan.id !== activePlanId);

  useEffect(() => {
    if (!activePlan) return;
    setCanvasDraft({ width: String(activePlan.canvas_w), height: String(activePlan.canvas_h) });
  }, [activePlan?.id, activePlan?.canvas_w, activePlan?.canvas_h]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(MASS_PLAN_DIRTY_STORAGE_KEY, dirty ? "1" : "0");
    window.dispatchEvent(new CustomEvent("plan-rayon:mass-plan-dirty", { detail: { dirty } }));
  }, [dirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    return () => {
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (loading || plans.length || !profile?.id) return;
    void handleCreateDefaultPlan(profile.id);
  }, [loading, plans.length, profile?.id]);

  async function bootstrap() {
    setLoading(true);
    try {
      const [nextPlans, nextLibrary] = await Promise.all([loadMassPlans(supabase), loadRayonLibrary(supabase)]);
      const hydratedLibrary = await hydrateLibrary(nextLibrary);
      setLibrary(hydratedLibrary);

      setPlans(nextPlans);
      const firstPlan = nextPlans[0] ?? null;
      setActivePlanId(firstPlan?.id ?? null);
      if (firstPlan) {
        const nextElements = await hydrateElements(await loadMassPlanElements(supabase, firstPlan.id));
        setElements(nextElements);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de charger le plan de masse.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDefaultPlan(userId: string) {
    try {
      setLoading(true);
      const created = await createMassPlan(supabase, "Plan global", DEFAULT_PLAN_WIDTH, DEFAULT_PLAN_HEIGHT, userId, 0);
      setPlans([created]);
      setActivePlanId(created.id);
      setElements([]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de créer le plan global.");
    } finally {
      setLoading(false);
    }
  }

  async function hydrateLibrary(items: RayonLibItem[]) {
    return Promise.all(
      items.map(async (item) => {
        if (!item.facing_image_url) return item;
        if (!signedUrlCache.current.has(item.facing_image_url)) {
          signedUrlCache.current.set(item.facing_image_url, await createFacingSignedUrl(supabase, item.facing_image_url));
        }
        return { ...item, facing_signed_url: signedUrlCache.current.get(item.facing_image_url) ?? null };
      }),
    );
  }

  async function hydrateElements(items: MassElement[]) {
    return Promise.all(
      items.map(async (item) => {
        if (!item.rayon_facing_url) return item;
        if (!signedUrlCache.current.has(item.rayon_facing_url)) {
          signedUrlCache.current.set(item.rayon_facing_url, await createFacingSignedUrl(supabase, item.rayon_facing_url));
        }
        return { ...item, rayon_facing_url: signedUrlCache.current.get(item.rayon_facing_url) ?? null };
      }),
    );
  }

  function pushHistory(next: MassElement[]) {
    setHistory((current) => [...current.slice(-19), next.map((element) => ({ ...element }))]);
  }

  async function loadPlan(planId: string) {
    setLoading(true);
    try {
      const nextElements = await hydrateElements(await loadMassPlanElements(supabase, planId));
      setActivePlanId(planId);
      setElements(nextElements);
      setSelectedIds(new Set());
      setDirty(false);
      setHistory([]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de charger le plan.");
    } finally {
      setLoading(false);
    }
  }

  async function switchPlan(planId: string) {
    if (planId === activePlanId) return;
    if (dirty) {
      setPendingSwitchPlanId(planId);
      return;
    }
    await loadPlan(planId);
  }

  function handleDropLibrary(payload: DragLibraryPayload, x: number, y: number) {
    if (!activePlan) return;
    pushHistory(elements);
    const size = buildDefaultSize(payload);
    const next: MassElement = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      plan_id: activePlan.id,
      rayon_plan_id: payload.kind === "rayon" ? payload.rayon.id : null,
      element_type: payload.kind === "rayon" ? "rayon" : payload.elementType,
      label:
        payload.kind === "rayon"
          ? payload.rayon.name
          : payload.label ??
            (payload.elementType === "alley-h" || payload.elementType === "alley-v"
              ? "ALLÉE"
              : payload.elementType === "text"
                ? "Texte"
              : payload.elementType === "tete-gondole"
                ? "TG"
                : "GB"),
      x,
      y: Math.max(PLAN_TITLE_BAR_HEIGHT, y),
      w: size.w,
      h: size.h,
      color:
        payload.kind === "rayon"
          ? payload.rayon.color
          : payload.color ?? (payload.elementType === "alley-h" || payload.elementType === "alley-v" ? "#d1d5db" : payload.elementType === "text" ? "#1f2b4d" : "#475569"),
      rotated: payload.kind === "rayon",
      z_index: elements.length + 1,
      rayon_name: payload.kind === "rayon" ? payload.rayon.name : undefined,
      rayon_color: payload.kind === "rayon" ? payload.rayon.color : undefined,
      rayon_elem_count: payload.kind === "rayon" ? payload.rayon.elem_count : undefined,
      rayon_facing_url: payload.kind === "rayon" ? payload.rayon.facing_signed_url ?? null : null,
      rayon_universe_name: payload.kind === "rayon" ? payload.rayon.universe_name : undefined,
      text_style:
        payload.kind === "structure" && payload.elementType === "text"
          ? getDefaultTextModuleStyle({
              textColor: payload.color ?? "#1f2b4d",
            })
          : null,
    };
    setElements((current) => [...current, next]);
    setSelectedIds(new Set([next.id]));
    setDirty(true);
  }

  function patchElements(ids: string[], updater: (element: MassElement, index: number) => MassElement) {
    setElements((current) =>
      current.map((element) => {
        const index = ids.indexOf(element.id);
        return index >= 0 ? updater(element, index) : element;
      }),
    );
    setDirty(true);
  }

  function patchSelected(patch: Partial<MassElement>) {
    if (!selectedElement) return;
    pushHistory(elements);
    patchElements([selectedElement.id], (element) => ({ ...element, ...patch }));
  }

  function setSelectedRotation(rotated: boolean) {
    if (!selectedIds.size) return;
    pushHistory(elements);
    const ids = Array.from(selectedIds);
    patchElements(ids, (element) => ({ ...element, rotated }));
    setSelectedIds(new Set(ids));
  }

  function setSelectedColor(color: string) {
    const ids = elements
      .filter(
        (element) =>
          selectedIds.has(element.id) &&
          element.element_type !== "alley-h" &&
          element.element_type !== "alley-v",
      )
      .map((element) => element.id);
    if (!ids.length) return;
    pushHistory(elements);
    patchElements(ids, (element) => ({
      ...element,
      color,
      text_style:
        element.element_type === "text"
          ? {
              ...(element.text_style ?? getDefaultTextModuleStyle()),
              textColor: color,
            }
          : element.text_style ?? null,
    }));
    setSelectedIds(new Set(selectedIds));
  }

  function deleteSelected() {
    if (!selectedIds.size) return;
    pushHistory(elements);
    setElements((current) => current.filter((element) => !selectedIds.has(element.id)));
    setSelectedIds(new Set());
    setDirty(true);
  }

  function duplicateElement(elementId: string) {
    const source = elements.find((element) => element.id === elementId);
    if (!source) return;
    pushHistory(elements);
    const next: MassElement = {
      ...source,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: source.x + GRID,
      y: source.y + GRID,
      z_index: Math.max(0, ...elements.map((element) => element.z_index)) + 1,
    };
    setElements((current) => [...current, next]);
    setSelectedIds(new Set([next.id]));
    setDirty(true);
  }

  function duplicateSelected() {
    if (!selectedIds.size) return;
    const selection = elements.filter((element) => selectedIds.has(element.id));
    if (!selection.length) return;
    pushHistory(elements);
    const topBase = Math.max(0, ...elements.map((element) => element.z_index));
    const duplicates = selection.map((element, index) => ({
      ...element,
      id: `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      x: Math.max(0, Math.min((activePlan?.canvas_w ?? 4000) - element.w, element.x + GRID)),
      y: Math.max(PLAN_TITLE_BAR_HEIGHT, Math.min((activePlan?.canvas_h ?? 3000) - element.h, element.y + GRID)),
      z_index: topBase + index + 1,
    }));
    setElements((current) => [...current, ...duplicates]);
    setSelectedIds(new Set(duplicates.map((element) => element.id)));
    setDirty(true);
  }

  function toggleRotation(elementId: string) {
    pushHistory(elements);
    patchElements([elementId], (element) => ({ ...element, rotated: !element.rotated }));
    setSelectedIds(new Set([elementId]));
  }

  function bringToFront(elementId: string) {
    pushHistory(elements);
    const top = Math.max(0, ...elements.map((element) => element.z_index)) + 1;
    patchElements([elementId], (element) => ({ ...element, z_index: top }));
    setSelectedIds(new Set([elementId]));
  }

  function toggleRotationSelected() {
    if (!selectedIds.size) return;
    pushHistory(elements);
    const ids = Array.from(selectedIds);
    patchElements(ids, (element) => ({ ...element, rotated: !element.rotated }));
    setSelectedIds(new Set(ids));
  }

  function bringSelectedToFront() {
    if (!selectedIds.size) return;
    pushHistory(elements);
    const ids = Array.from(selectedIds);
    const topBase = Math.max(0, ...elements.map((element) => element.z_index));
    patchElements(ids, (element, index) => ({
      ...element,
      z_index: topBase + index + 1,
    }));
    setSelectedIds(new Set(ids));
  }

  function deleteElementById(elementId: string) {
    pushHistory(elements);
    setElements((current) => current.filter((element) => element.id !== elementId));
    setSelectedIds(new Set());
    setDirty(true);
  }

  function parseCanvasDraft() {
    if (!activePlan) return { width: DEFAULT_PLAN_WIDTH, height: DEFAULT_PLAN_HEIGHT };
    const parsedWidth = Number.parseInt(canvasDraft.width, 10);
    const parsedHeight = Number.parseInt(canvasDraft.height, 10);
    return {
      width: Math.max(800, Math.min(4000, Number.isFinite(parsedWidth) ? parsedWidth : activePlan.canvas_w)),
      height: Math.max(400, Math.min(3000, Number.isFinite(parsedHeight) ? parsedHeight : activePlan.canvas_h)),
    };
  }

  async function saveCurrentPlan() {
    if (!activePlan || !profile?.id) return;
    try {
      setSaving(true);
      const nextCanvas = parseCanvasDraft();
      setPlans((current) =>
        current.map((plan) =>
          plan.id === activePlan.id
            ? { ...plan, canvas_w: nextCanvas.width, canvas_h: nextCanvas.height }
            : plan,
        ),
      );
      await saveMassPlanElements(
        supabase,
        activePlan.id,
        elements,
        nextCanvas,
        profile.id,
      );
      const refreshedPlans = await loadMassPlans(supabase);
      const refreshed = await hydrateElements(await loadMassPlanElements(supabase, activePlan.id));
      setPlans(refreshedPlans);
      setElements(refreshed);
      setDirty(false);
      setHistory([]);
      setToast("Plan sauvegardé");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de sauvegarder le plan.");
    } finally {
      setSaving(false);
    }
  }

  function undoLast() {
    setHistory((current) => {
      const next = [...current];
      const previous = next.pop();
      if (previous) {
        setElements(previous);
        setDirty(true);
      }
      return next;
    });
  }

  async function handleCreatePlan() {
    if (!profile?.id || !newPlanDraft.name.trim()) return;
    try {
      setSaving(true);
      const created = await createMassPlan(supabase, newPlanDraft.name.trim(), newPlanDraft.width, newPlanDraft.height, profile.id, plans.length);
      const nextPlans = [...plans, created];
      setPlans(nextPlans);
      setNewPlanOpen(false);
      setNewPlanDraft({ name: "Plan global", width: DEFAULT_PLAN_WIDTH, height: DEFAULT_PLAN_HEIGHT });
      await switchPlan(created.id);
      setToast(`Plan "${created.name}" créé`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de créer le plan.");
    } finally {
      setSaving(false);
    }
  }

  function openImportPlanModal() {
    if (!importablePlans.length) return;
    setImportSourcePlanId((current) => current || importablePlans[0]?.id || "");
    setImportMode("append");
    setImportPlanOpen(true);
  }

  async function handleImportPlan() {
    if (!activePlan || !importSourcePlanId) return;
    try {
      setSaving(true);
      const sourceElements = await hydrateElements(await loadMassPlanElements(supabase, importSourcePlanId));
      pushHistory(elements);
      const imported = buildImportedElements({
        sourceElements,
        existingElements: elements,
        targetPlanId: activePlan.id,
        mode: importMode,
        canvasW: activePlan.canvas_w,
        canvasH: activePlan.canvas_h,
      });
      setElements(imported);
      const importedIds = imported.slice(importMode === "append" ? elements.length : 0).map((element) => element.id);
      setSelectedIds(new Set(importedIds));
      setDirty(true);
      setImportPlanOpen(false);
      const sourcePlanName = plans.find((plan) => plan.id === importSourcePlanId)?.name ?? "le plan source";
      setToast(
        importMode === "append"
          ? `Plan "${sourcePlanName}" importé dans "${activePlan.name}"`
          : `Plan "${activePlan.name}" remplacé par "${sourcePlanName}"`,
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible d'importer ce plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan() {
    if (!activePlan || plans.length <= 1) return;
    try {
      setSaving(true);
      await deleteMassPlan(supabase, activePlan.id);
      const nextPlans = plans.filter((plan) => plan.id !== activePlan.id);
      setPlans(nextPlans);
      setActivePlanId(nextPlans[0]?.id ?? null);
      const nextElements = nextPlans[0] ? await hydrateElements(await loadMassPlanElements(supabase, nextPlans[0].id)) : [];
      setElements(nextElements);
      setSelectedIds(new Set());
      setDirty(false);
      setDeletePlanOpen(false);
      setToast("Plan supprimé");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Impossible de supprimer le plan.");
    } finally {
      setSaving(false);
    }
  }

  function resizeCanvas(width: number, height: number) {
    if (!activePlan) return;
    const nextWidth = Math.max(800, Math.min(4000, width));
    const nextHeight = Math.max(400, Math.min(3000, height));
    setPlans((current) =>
      current.map((plan) =>
        plan.id === activePlan.id
          ? { ...plan, canvas_w: nextWidth, canvas_h: nextHeight }
          : plan,
      ),
    );
    setDirty(true);

    if (resizeDebounceRef.current) {
      window.clearTimeout(resizeDebounceRef.current);
    }
    resizeDebounceRef.current = window.setTimeout(() => {
      void updateMassPlanDimensions(supabase, activePlan.id, nextWidth, nextHeight);
    }, 800);
  }

  function commitCanvasDraft(nextWidth = canvasDraft.width, nextHeight = canvasDraft.height) {
    if (!activePlan) return;
    const parsedWidth = Number.parseInt(nextWidth, 10);
    const parsedHeight = Number.parseInt(nextHeight, 10);
    const safeWidth = Number.isFinite(parsedWidth) ? parsedWidth : activePlan.canvas_w;
    const safeHeight = Number.isFinite(parsedHeight) ? parsedHeight : activePlan.canvas_h;
    resizeCanvas(safeWidth, safeHeight);
  }

  async function toggleFullscreen() {
    const container = fullscreenRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }
      await container.requestFullscreen();
    } catch {
      setToast("Impossible d'activer le plein écran.");
    }
  }

  async function confirmSwitchPlan() {
    if (!pendingSwitchPlanId) return;
    const nextPlanId = pendingSwitchPlanId;
    setPendingSwitchPlanId(null);
    await loadPlan(nextPlanId);
  }

  return (
    <div ref={fullscreenRef} style={rootStyle(isFullscreen)}>
      <Card static style={headerCardStyle(isFullscreen)}>
        <div style={headerMainRowStyle(isFullscreen)}>
          <div style={headerLeftGroupStyle}>
            <span style={eyebrowStyle}>Plan de masse magasin :</span>
            <select value={activePlanId ?? ""} onChange={(event) => void switchPlan(event.target.value)} style={selectStyle} disabled={loading || roleLoading}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            {canWrite ? (
              <>
                <button type="button" onClick={() => setNewPlanOpen(true)} style={ghostButtonStyle}>+ Nouveau plan</button>
                <button type="button" onClick={openImportPlanModal} disabled={!importablePlans.length} style={ghostButtonStyle}>⇄ Importer un plan</button>
                <button type="button" onClick={() => setDeletePlanOpen(true)} disabled={plans.length <= 1} style={dangerGhostStyle(plans.length > 1)}>
                  🗑
                </button>
              </>
            ) : null}
          </div>
          {activePlan ? (
            <div style={canvasSizeSlotStyle(isFullscreen)}>
              {!isFullscreen ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {`Canvas : ${activePlan.canvas_w} × ${activePlan.canvas_h}px`}
                </div>
              ) : null}
              <div style={canvasSizeGroupStyle}>
                <input
                  type="number"
                  value={canvasDraft.width}
                  step={GRID}
                  onChange={(event) => setCanvasDraft((current) => ({ ...current, width: event.target.value }))}
                  onBlur={() => commitCanvasDraft(canvasDraft.width, canvasDraft.height)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitCanvasDraft(canvasDraft.width, canvasDraft.height);
                  }}
                  style={sizeInputStyle}
                />
                <span style={{ color: "#94a3b8" }}>×</span>
                <input
                  type="number"
                  value={canvasDraft.height}
                  step={GRID}
                  onChange={(event) => setCanvasDraft((current) => ({ ...current, height: event.target.value }))}
                  onBlur={() => commitCanvasDraft(canvasDraft.width, canvasDraft.height)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitCanvasDraft(canvasDraft.width, canvasDraft.height);
                  }}
                  style={sizeInputStyle}
                />
              </div>
            </div>
          ) : null}
          <div style={headerRightGroupStyle}>
            <button type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.15).toFixed(2))))} style={iconButtonStyle}>−</button>
            <div style={zoomStyle}>{Math.round(zoom * 100)}%</div>
            <button type="button" onClick={() => setZoom((current) => Math.min(1.8, Number((current + 0.15).toFixed(2))))} style={iconButtonStyle}>+</button>
            <button type="button" onClick={() => setZoom(1)} style={iconButtonStyle}>⊡</button>
            <button type="button" onClick={() => void toggleFullscreen()} style={focusButtonStyle(isFullscreen)}>
              {isFullscreen ? "⤢ Quitter" : "⛶ Plein écran"}
            </button>
            <button type="button" onClick={() => setGridEnabled((current) => !current)} style={iconToggleStyle(gridEnabled)}>⊞ Grille</button>
            <button type="button" onClick={undoLast} disabled={!history.length} style={ghostButtonStyle}>↩ Annuler</button>
            <button type="button" onClick={() => { pushHistory(elements); setElements([]); setSelectedIds(new Set()); setDirty(true); }} disabled={!canWrite || !elements.length} style={ghostButtonStyle}>🗑 Vider</button>
            <button type="button" onClick={() => void saveCurrentPlan()} disabled={!canWrite || saving || !dirty} style={saveButtonStyle(!canWrite || saving || !dirty)}>
              {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>
          </div>
        </div>
      </Card>

      <div style={workspaceStyle(isFullscreen)}>
        <MassPlanSidebar canWrite={canWrite} library={library} />
        <MassPlanCanvas
          planName={activePlan?.name ?? "Plan de masse"}
          canvasW={activePlan?.canvas_w ?? 1200}
          canvasH={activePlan?.canvas_h ?? 700}
          elements={elements}
          selectedIds={selectedIds}
          zoom={zoom}
          gridEnabled={gridEnabled}
          canWrite={canWrite}
          onDropLibrary={handleDropLibrary}
          onSelectIds={setSelectedIds}
          onPatchElements={patchElements}
          onClearSelection={() => setSelectedIds(new Set())}
          onDuplicateElement={duplicateElement}
          onDuplicateSelected={duplicateSelected}
          onToggleRotation={toggleRotation}
          onToggleRotationSelected={toggleRotationSelected}
          onBringToFront={bringToFront}
          onBringSelectedToFront={bringSelectedToFront}
          onDeleteElement={deleteElementById}
          onDeleteSelected={deleteSelected}
        />
        <MassPlanInspector
          selected={selectedElement}
          selectedElements={selectedElements}
          canWrite={canWrite}
          onPatch={patchSelected}
          onSetSelectedRotation={setSelectedRotation}
          onSetSelectedColor={setSelectedColor}
          onDelete={deleteSelected}
        />
      </div>

      <div style={statusBarStyle(isFullscreen)}>
        <span style={statusItemStyle}>Plan : <strong>{activePlan?.name ?? "—"}</strong></span>
        <span style={statusItemStyle}>Éléments : <strong>{elements.length}</strong></span>
        <span style={statusItemStyle}>Sélection : <strong>{selectedIds.size}</strong></span>
        <span style={statusItemStyle}>État : <strong>{dirty ? "Modifié" : "À jour"}</strong></span>
      </div>

        <NewPlanModal
          open={newPlanOpen}
          name={newPlanDraft.name}
        width={newPlanDraft.width}
        height={newPlanDraft.height}
        pending={saving}
        onClose={() => setNewPlanOpen(false)}
        onNameChange={(value) => setNewPlanDraft((current) => ({ ...current, name: value }))}
        onWidthChange={(value) => setNewPlanDraft((current) => ({ ...current, width: value }))}
        onHeightChange={(value) => setNewPlanDraft((current) => ({ ...current, height: value }))}
        onSubmit={() => void handleCreatePlan()}
      />

      <DeletePlanModal
        open={deletePlanOpen}
        planName={activePlan?.name ?? "ce plan"}
        pending={saving}
        onClose={() => setDeletePlanOpen(false)}
        onConfirm={() => void handleDeletePlan()}
      />

      <ImportPlanModal
        open={importPlanOpen}
        pending={saving}
        sourcePlanId={importSourcePlanId}
        mode={importMode}
        options={importablePlans.map((plan) => ({ id: plan.id, name: plan.name }))}
        onClose={() => setImportPlanOpen(false)}
        onSourcePlanChange={setImportSourcePlanId}
        onModeChange={setImportMode}
        onSubmit={() => void handleImportPlan()}
      />

      <PlanRayonConfirmModal
        open={Boolean(pendingSwitchPlanId)}
        title="Changer de plan sans sauvegarder ?"
        description="Ce plan contient des modifications non sauvegardées. Si vous continuez, elles seront perdues pour cette session."
        confirmLabel="Changer de plan"
        onClose={() => setPendingSwitchPlanId(null)}
        onConfirm={() => void confirmSwitchPlan()}
      />

      <div style={toastStyle(Boolean(toast))}>{toast}</div>
    </div>
  );
}

const rootStyle = (fullscreen: boolean): CSSProperties => ({
  display: "grid",
  gap: 16,
  background: fullscreen ? "#f8fafc" : "transparent",
  minHeight: fullscreen ? "100vh" : undefined,
  padding: fullscreen ? 16 : 0,
  overflow: fullscreen ? "auto" : undefined,
});

const headerCardStyle = (fullscreen: boolean): CSSProperties => ({
  padding: 14,
  display: "grid",
  gap: 14,
  overflow: "visible",
  position: fullscreen ? "sticky" : "relative",
  top: fullscreen ? 0 : undefined,
  zIndex: fullscreen ? 20 : undefined,
});

const headerMainRowStyle = (fullscreen: boolean): CSSProperties => ({
  display: "flex",
  alignItems: fullscreen ? "flex-start" : "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
});

const headerLeftGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0,
  flex: "1 1 520px",
};

const canvasSizeSlotStyle = (fullscreen: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  flex: fullscreen ? "0 1 auto" : "1 1 240px",
  minWidth: 0,
});

const headerRightGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  flex: "1 1 420px",
};

const canvasSizeGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  padding: "6px 10px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e6eaf0",
};

const workspaceStyle = (fullscreen: boolean): CSSProperties => ({
  display: "flex",
  minHeight: fullscreen ? "calc(100vh - 168px)" : "70vh",
  overflow: "hidden",
  borderRadius: 18,
  border: "1px solid #e6eaf0",
  background: "#fff",
});

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#617286",
};

const selectStyle: CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #d5d9e6",
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 700,
  color: "#13243b",
  minWidth: 180,
};

const iconButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
};

const zoomStyle: CSSProperties = {
  minWidth: 44,
  textAlign: "center",
  fontSize: 12,
  fontWeight: 700,
  color: "#617286",
};

const iconToggleStyle = (active: boolean): CSSProperties => ({
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${active ? "#fecaca" : "#d5d9e6"}`,
  background: active ? "#fff1f2" : "#fff",
  color: active ? "#d40511" : "#475569",
  fontSize: 12,
  fontWeight: 700,
});

const ghostButtonStyle: CSSProperties = {
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
};

const focusButtonStyle = (active: boolean): CSSProperties => ({
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${active ? "#93c5fd" : "#d5d9e6"}`,
  background: active ? "#eff6ff" : "#fff",
  color: active ? "#1d4ed8" : "#475569",
  fontSize: 12,
  fontWeight: 700,
});

const dangerGhostStyle = (enabled: boolean): CSSProperties => ({
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 800,
  opacity: enabled ? 1 : 0.55,
});

const saveButtonStyle = (disabled: boolean): CSSProperties => ({
  minHeight: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const sizeInputStyle: CSSProperties = {
  width: 84,
  minHeight: 34,
  borderRadius: 8,
  border: "1px solid #d5d9e6",
  padding: "0 10px",
  fontSize: 12,
};

const statusBarStyle = (fullscreen: boolean): CSSProperties => ({
  minHeight: 28,
  borderRadius: 12,
  background: "#1a1a2e",
  color: "rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  gap: 20,
  padding: "0 16px",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: fullscreen ? 0 : undefined,
});

const statusItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const toastStyle = (visible: boolean): CSSProperties => ({
  position: "fixed",
  left: "50%",
  bottom: 34,
  transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(16px)",
  opacity: visible ? 1 : 0,
  transition: "all 0.18s ease",
  pointerEvents: "none",
  background: "#1a1a2e",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 700,
  zIndex: 600,
});
