"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { useUserRole } from "@/lib/use-user-role";
import { buildImportedElements, type MassPlanImportMode } from "@/lib/mass-plan-import";
import { createFacingSignedUrl, createMassPlan, deleteMassPlan, loadMassPlanElements, loadMassPlans, loadRayonLibrary, saveMassPlanElements } from "@/lib/mass-plan-db";
import { MassPlanCanvas } from "@/components/plan-rayon/mass-plan/mass-plan-canvas";
import { MassPlanInspector } from "@/components/plan-rayon/mass-plan/mass-plan-inspector";
import { DeletePlanModal, ImportPlanModal, NewPlanModal } from "@/components/plan-rayon/mass-plan/mass-plan-modals";
import { MassPlanSidebar } from "@/components/plan-rayon/mass-plan/mass-plan-sidebar";
import type { DragLibraryPayload, MassElement, MassPlan, RayonLibItem } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID, PLAN_TITLE_BAR_HEIGHT } from "@/components/plan-rayon/mass-plan/mass-plan-types";

const DEFAULT_PLAN_WIDTH = 1200;
const DEFAULT_PLAN_HEIGHT = 1200;

function buildDefaultSize(payload: DragLibraryPayload) {
  if (payload.kind === "structure") {
    if (payload.elementType === "alley-h") return { w: GRID * 4, h: GRID };
    if (payload.elementType === "alley-v") return { w: GRID, h: GRID * 4 };
    return { w: GRID * 2, h: GRID };
  }
  const rows = Math.max(2, payload.rayon.elem_count);
  return { w: GRID, h: rows * GRID };
}

export function MassPlanView() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, loading: roleLoading, canWriteModule } = useUserRole();
  const canWrite = canWriteModule("plan_rayon");
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
  const signedUrlCache = useRef(new Map<string, string>());

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? null;
  const selectedElement = selectedIds.size === 1 ? elements.find((element) => selectedIds.has(element.id)) ?? null : null;
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

  async function switchPlan(planId: string) {
    if (planId === activePlanId) return;
    if (dirty) {
      const proceed = window.confirm("Ce plan a des modifications non sauvegardées. Changer de plan maintenant ?");
      if (!proceed) return;
    }
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

  function handleDropLibrary(payload: DragLibraryPayload, x: number, y: number) {
    if (!activePlan) return;
    pushHistory(elements);
    const size = buildDefaultSize(payload);
    const next: MassElement = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      plan_id: activePlan.id,
      rayon_plan_id: payload.kind === "rayon" ? payload.rayon.id : null,
      element_type: payload.kind === "rayon" ? "rayon" : payload.elementType,
      label: payload.kind === "rayon" ? payload.rayon.name : payload.elementType === "alley-h" || payload.elementType === "alley-v" ? "ALLÉE" : payload.elementType === "tete-gondole" ? "TG" : "GB",
      x,
      y: Math.max(PLAN_TITLE_BAR_HEIGHT, y),
      w: size.w,
      h: size.h,
      color: payload.kind === "rayon" ? payload.rayon.color : payload.elementType === "alley-h" || payload.elementType === "alley-v" ? "#d1d5db" : "#475569",
      rotated: payload.kind === "rayon",
      z_index: elements.length + 1,
      rayon_name: payload.kind === "rayon" ? payload.rayon.name : undefined,
      rayon_color: payload.kind === "rayon" ? payload.rayon.color : undefined,
      rayon_elem_count: payload.kind === "rayon" ? payload.rayon.elem_count : undefined,
      rayon_facing_url: payload.kind === "rayon" ? payload.rayon.facing_signed_url ?? null : null,
      rayon_universe_name: payload.kind === "rayon" ? payload.rayon.universe_name : undefined,
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

  function deleteElementById(elementId: string) {
    pushHistory(elements);
    setElements((current) => current.filter((element) => element.id !== elementId));
    setSelectedIds(new Set());
    setDirty(true);
  }

  async function saveCurrentPlan() {
    if (!activePlan || !profile?.id) return;
    try {
      setSaving(true);
      await saveMassPlanElements(supabase, activePlan.id, elements, profile.id);
      const refreshed = await hydrateElements(await loadMassPlanElements(supabase, activePlan.id));
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
    setPlans((current) =>
      current.map((plan) =>
        plan.id === activePlan.id
          ? { ...plan, canvas_w: Math.max(800, Math.min(4000, width)), canvas_h: Math.max(400, Math.min(3000, height)) }
          : plan,
      ),
    );
    setDirty(true);
  }

  function commitCanvasDraft(nextWidth = canvasDraft.width, nextHeight = canvasDraft.height) {
    if (!activePlan) return;
    const parsedWidth = Number.parseInt(nextWidth, 10);
    const parsedHeight = Number.parseInt(nextHeight, 10);
    const safeWidth = Number.isFinite(parsedWidth) ? parsedWidth : activePlan.canvas_w;
    const safeHeight = Number.isFinite(parsedHeight) ? parsedHeight : activePlan.canvas_h;
    resizeCanvas(safeWidth, safeHeight);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card static style={{ padding: 14, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.15).toFixed(2))))} style={iconButtonStyle}>−</button>
            <div style={zoomStyle}>{Math.round(zoom * 100)}%</div>
            <button type="button" onClick={() => setZoom((current) => Math.min(1.8, Number((current + 0.15).toFixed(2))))} style={iconButtonStyle}>+</button>
            <button type="button" onClick={() => setZoom(1)} style={iconButtonStyle}>⊡</button>
            <button type="button" onClick={() => setGridEnabled((current) => !current)} style={iconToggleStyle(gridEnabled)}>⊞ Grille</button>
            <button type="button" onClick={undoLast} disabled={!history.length} style={ghostButtonStyle}>↩ Annuler</button>
            <button type="button" onClick={() => { pushHistory(elements); setElements([]); setSelectedIds(new Set()); setDirty(true); }} disabled={!canWrite || !elements.length} style={ghostButtonStyle}>🗑 Vider</button>
            <button type="button" onClick={() => void saveCurrentPlan()} disabled={!canWrite || saving || !dirty} style={saveButtonStyle(!canWrite || saving || !dirty)}>
              {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {activePlan ? `Canvas : ${activePlan.canvas_w} × ${activePlan.canvas_h}px` : "Aucun plan chargé"}
          </div>
          {activePlan ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          ) : null}
        </div>
      </Card>

      <div style={workspaceStyle}>
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
          onToggleRotation={toggleRotation}
          onBringToFront={bringToFront}
          onDeleteElement={deleteElementById}
        />
        <MassPlanInspector selected={selectedElement} canWrite={canWrite} onPatch={patchSelected} onDelete={deleteSelected} />
      </div>

      <div style={statusBarStyle}>
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

      <div style={toastStyle(Boolean(toast))}>{toast}</div>
    </div>
  );
}

const workspaceStyle: CSSProperties = {
  display: "flex",
  minHeight: "70vh",
  overflow: "hidden",
  borderRadius: 18,
  border: "1px solid #e6eaf0",
  background: "#fff",
};

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

const statusBarStyle: CSSProperties = {
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
};

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
