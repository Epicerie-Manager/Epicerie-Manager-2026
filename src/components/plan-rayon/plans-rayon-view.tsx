"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { useUserRole } from "@/lib/use-user-role";
import {
  createFacingSignedUrl,
  createRayon,
  createUniverse,
  deleteRayon,
  deleteUniverse,
  loadUniverses,
  saveRayonFacing,
  type RayonPlanItem,
  type RayonUniverse,
  updateUniverseName,
} from "@/lib/plans-rayon-db";
import { FacingModal } from "@/components/plan-rayon/facing-modal";
import { RayonModal } from "@/components/plan-rayon/rayon-modal";
import { UniverseModal } from "@/components/plan-rayon/universe-modal";

const UNIVERSE_CACHE_TTL_MS = 10 * 60 * 1000;
const SIGNED_URL_TTL_MS = 45 * 60 * 1000;

const plansRayonViewCache: {
  universes: RayonUniverse[] | null;
  universesFetchedAt: number;
  signedUrls: Record<string, string>;
  signedUrlsFetchedAt: Record<string, number>;
} = {
  universes: null,
  universesFetchedAt: 0,
  signedUrls: {},
  signedUrlsFetchedAt: {},
};

const compactButton: CSSProperties = {
  minHeight: 30,
  borderRadius: 8,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer",
};

export function PlansRayonView() {
  const supabase = useMemo(() => createClient(), []);
  const { loading: roleLoading, profile, canWriteModule } = useUserRole();
  const canWrite = canWriteModule("plan_rayon");
  const [universes, setUniverses] = useState<RayonUniverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openUniverses, setOpenUniverses] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const signedUrlCache = useRef(new Map<string, string>());
  const [toast, setToast] = useState("");
  const [universeModalOpen, setUniverseModalOpen] = useState(false);
  const [rayonModalUniverseId, setRayonModalUniverseId] = useState<string | null>(null);
  const [facingTarget, setFacingTarget] = useState<{ universe: RayonUniverse; rayon: RayonPlanItem } | null>(null);
  const [saving, setSaving] = useState<"universe" | "rayon" | "facing" | null>(null);
  const [universeDraft, setUniverseDraft] = useState({ name: "", icon: "🛒", color: "#0a4f98" });
  const [rayonDraft, setRayonDraft] = useState({ name: "", elemCount: 6, color: "#0a4f98" });
  const [renamingUniverseId, setRenamingUniverseId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "universe"; universe: RayonUniverse }
    | { kind: "rayon"; rayon: RayonPlanItem }
    | null
  >(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void reload(true);
  }, []);

  useEffect(() => {
    if (!universes.length) return;

    const withFacing = universes.flatMap((universe) => universe.rayons).filter((rayon) => rayon.facing_image_url);
    withFacing.forEach((rayon) => {
      if (!rayon.facing_image_url) return;
      const cachedUrl = plansRayonViewCache.signedUrls[rayon.id];
      const cachedAt = plansRayonViewCache.signedUrlsFetchedAt[rayon.id] ?? 0;
      const stillValid = cachedUrl && Date.now() - cachedAt < SIGNED_URL_TTL_MS;
      if (stillValid) {
        signedUrlCache.current.set(rayon.id, cachedUrl);
        setSignedUrls((current) => (current[rayon.id] === cachedUrl ? current : { ...current, [rayon.id]: cachedUrl }));
        warmImage(cachedUrl);
        return;
      }
      if (signedUrlCache.current.has(rayon.id)) return;
      void createFacingSignedUrl(supabase, rayon.facing_image_url)
        .then((url) => {
          signedUrlCache.current.set(rayon.id, url);
          plansRayonViewCache.signedUrls[rayon.id] = url;
          plansRayonViewCache.signedUrlsFetchedAt[rayon.id] = Date.now();
          setSignedUrls((current) => ({ ...current, [rayon.id]: url }));
          warmImage(url);
        })
        .catch(() => undefined);
    });
  }, [supabase, universes]);

  async function reload(preferCache = false) {
    const hasFreshUniverseCache =
      preferCache &&
      plansRayonViewCache.universes &&
      Date.now() - plansRayonViewCache.universesFetchedAt < UNIVERSE_CACHE_TTL_MS;

    if (hasFreshUniverseCache) {
      const cachedUniverses = plansRayonViewCache.universes ?? [];
      setUniverses(cachedUniverses);
      setSignedUrls({ ...plansRayonViewCache.signedUrls });
      Object.entries(plansRayonViewCache.signedUrls).forEach(([rayonId, url]) => {
        signedUrlCache.current.set(rayonId, url);
        warmImage(url);
      });
      setOpenUniverses((current) => {
        if (current.size) return new Set(Array.from(current).filter((id) => cachedUniverses.some((universe) => universe.id === id)));
        return new Set(cachedUniverses[0] ? [cachedUniverses[0].id] : []);
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const next = await loadUniverses(supabase);
      plansRayonViewCache.universes = next;
      plansRayonViewCache.universesFetchedAt = Date.now();
      setUniverses(next);
      setOpenUniverses((current) => {
        if (current.size) return new Set(Array.from(current).filter((id) => next.some((universe) => universe.id === id)));
        return new Set(next[0] ? [next[0].id] : []);
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de charger les plans rayon.");
    } finally {
      setLoading(false);
    }
  }

  async function createUniverseAction() {
    if (!profile?.id || !universeDraft.name.trim()) return;
    try {
      setSaving("universe");
      await createUniverse(supabase, {
        name: universeDraft.name.trim(),
        icon: universeDraft.icon,
        color: universeDraft.color,
        position: universes.length,
        userId: profile.id,
      });
      setUniverseDraft({ name: "", icon: "🛒", color: "#0a4f98" });
      setUniverseModalOpen(false);
      invalidatePlansRayonCache();
      await reload();
      setToast(`Univers "${universeDraft.name.trim()}" créé`);
    } finally {
      setSaving(null);
    }
  }

  async function createRayonAction() {
    const universe = universes.find((entry) => entry.id === rayonModalUniverseId);
    if (!profile?.id || !universe || !rayonDraft.name.trim()) return;
    try {
      setSaving("rayon");
      await createRayon(supabase, {
        universeId: universe.id,
        name: rayonDraft.name.trim(),
        color: rayonDraft.color,
        elemCount: Math.max(1, Math.min(30, rayonDraft.elemCount || 1)),
        position: universe.rayons.length,
        userId: profile.id,
      });
      setRayonDraft({ name: "", elemCount: 6, color: "#0a4f98" });
      setRayonModalUniverseId(null);
      invalidatePlansRayonCache();
      await reload();
      setOpenUniverses((current) => new Set(current).add(universe.id));
      setToast(`Rayon "${rayonDraft.name.trim()}" ajouté`);
    } finally {
      setSaving(null);
    }
  }

  async function renameUniverseAction(universeId: string) {
    if (!profile?.id || !renameValue.trim()) return;
    try {
      await updateUniverseName(supabase, universeId, renameValue.trim(), profile.id);
      setUniverses((current) => {
        const next = current.map((universe) => universe.id === universeId ? { ...universe, name: renameValue.trim() } : universe);
        plansRayonViewCache.universes = next;
        plansRayonViewCache.universesFetchedAt = Date.now();
        return next;
      });
      setRenamingUniverseId(null);
      setRenameValue("");
      setToast("Univers renommé");
    } catch (nextError) {
      setToast(nextError instanceof Error ? nextError.message : "Impossible de renommer l'univers.");
    }
  }

  async function deleteUniverseAction(universe: RayonUniverse) {
    try {
      setSaving("universe");
      await deleteUniverse(supabase, universe);
      setUniverses((current) => {
        const next = current.filter((entry) => entry.id !== universe.id);
        plansRayonViewCache.universes = next;
        plansRayonViewCache.universesFetchedAt = Date.now();
        return next;
      });
      universe.rayons.forEach((rayon) => {
        delete plansRayonViewCache.signedUrls[rayon.id];
        delete plansRayonViewCache.signedUrlsFetchedAt[rayon.id];
      });
      setDeleteTarget(null);
      setToast(`Univers "${universe.name}" supprimé`);
    } catch (nextError) {
      setToast(nextError instanceof Error ? nextError.message : "Impossible de supprimer l'univers.");
    } finally {
      setSaving(null);
    }
  }

  async function deleteRayonAction(rayon: RayonPlanItem) {
    try {
      setSaving("rayon");
      await deleteRayon(supabase, rayon);
      setUniverses((current) => {
        const next = current.map((universe) =>
          universe.id === rayon.universe_id ? { ...universe, rayons: universe.rayons.filter((entry) => entry.id !== rayon.id) } : universe,
        );
        plansRayonViewCache.universes = next;
        plansRayonViewCache.universesFetchedAt = Date.now();
        return next;
      });
      signedUrlCache.current.delete(rayon.id);
      delete plansRayonViewCache.signedUrls[rayon.id];
      delete plansRayonViewCache.signedUrlsFetchedAt[rayon.id];
      setSignedUrls((current) => {
        const next = { ...current };
        delete next[rayon.id];
        return next;
      });
      setDeleteTarget(null);
      setToast(`Rayon "${rayon.name}" supprimé`);
    } catch (nextError) {
      setToast(nextError instanceof Error ? nextError.message : "Impossible de supprimer le rayon.");
    } finally {
      setSaving(null);
    }
  }

  async function saveFacingAction(file: File) {
    if (!profile?.id || !facingTarget) return;
    try {
      setSaving("facing");
      const path = await saveRayonFacing(supabase, { rayon: facingTarget.rayon, file, userId: profile.id });
      signedUrlCache.current.delete(facingTarget.rayon.id);
      const signedUrl = await createFacingSignedUrl(supabase, path);
      signedUrlCache.current.set(facingTarget.rayon.id, signedUrl);
      plansRayonViewCache.signedUrls[facingTarget.rayon.id] = signedUrl;
      plansRayonViewCache.signedUrlsFetchedAt[facingTarget.rayon.id] = Date.now();
      setSignedUrls((current) => ({ ...current, [facingTarget.rayon.id]: signedUrl }));
      warmImage(signedUrl);
      invalidatePlansRayonUniverseCache();
      await reload();
      setFacingTarget(null);
      setToast(`Facing de "${facingTarget.rayon.name}" enregistré`);
    } finally {
      setSaving(null);
    }
  }

  const rayonModalUniverse = rayonModalUniverseId ? universes.find((entry) => entry.id === rayonModalUniverseId) ?? null : null;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d40511" }}>Structure des rayons</div>
          <h2 style={{ marginTop: 8, fontSize: 38, letterSpacing: "-0.05em", color: "#13243b" }}>Plans rayon</h2>
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.7, color: "#617286" }}>
            Organisez vos univers et rayons. Ajoutez l'image facing de chaque rayon pour l'intégrer au plan de masse.
          </p>
        </div>
        {canWrite ? (
          <button type="button" onClick={() => setUniverseModalOpen(true)} style={primaryButtonStyle}>+ Nouvel univers</button>
        ) : null}
      </div>

      {loading || roleLoading ? <PlansSkeleton /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gap: 24 }}>
            {universes.map((universe) => (
              <UniverseCard
                key={universe.id}
                universe={universe}
                open={openUniverses.has(universe.id)}
                canWrite={canWrite}
                renaming={renamingUniverseId === universe.id}
                renameValue={renameValue}
                signedUrls={signedUrls}
                onToggle={() =>
                  setOpenUniverses((current) => {
                    const next = new Set(current);
                    if (next.has(universe.id)) next.delete(universe.id);
                    else next.add(universe.id);
                    return next;
                  })
                }
                onStartRename={() => {
                  setRenamingUniverseId(universe.id);
                  setRenameValue(universe.name);
                }}
                onRenameChange={setRenameValue}
                onRenameCancel={() => {
                  setRenamingUniverseId(null);
                  setRenameValue("");
                }}
                onRenameSubmit={() => void renameUniverseAction(universe.id)}
                onAddRayon={() => setRayonModalUniverseId(universe.id)}
                onDeleteUniverse={() => setDeleteTarget({ kind: "universe", universe })}
                onOpenFacing={(rayon) => setFacingTarget({ universe, rayon })}
                onDeleteRayon={(rayon) => setDeleteTarget({ kind: "rayon", rayon })}
              />
            ))}
          </div>

          {canWrite ? (
            <button type="button" onClick={() => setUniverseModalOpen(true)} style={addUniverseStyle}>
              <span style={{ fontSize: 22 }}>＋</span>
              Ajouter un univers
            </button>
          ) : null}
        </>
      ) : null}

      <UniverseModal
        open={universeModalOpen}
        pending={saving === "universe"}
        name={universeDraft.name}
        icon={universeDraft.icon}
        color={universeDraft.color}
        onClose={() => setUniverseModalOpen(false)}
        onNameChange={(value) => setUniverseDraft((current) => ({ ...current, name: value }))}
        onIconChange={(value) => setUniverseDraft((current) => ({ ...current, icon: value }))}
        onColorChange={(value) => setUniverseDraft((current) => ({ ...current, color: value }))}
        onSubmit={() => void createUniverseAction()}
      />

      <RayonModal
        open={Boolean(rayonModalUniverse)}
        pending={saving === "rayon"}
        universeName={rayonModalUniverse?.name ?? ""}
        name={rayonDraft.name}
        elemCount={rayonDraft.elemCount}
        color={rayonDraft.color}
        onClose={() => setRayonModalUniverseId(null)}
        onNameChange={(value) => setRayonDraft((current) => ({ ...current, name: value }))}
        onElemCountChange={(value) => setRayonDraft((current) => ({ ...current, elemCount: value }))}
        onColorChange={(value) => setRayonDraft((current) => ({ ...current, color: value }))}
        onSubmit={() => void createRayonAction()}
      />

      <FacingModal
        open={Boolean(facingTarget)}
        rayon={facingTarget?.rayon ?? null}
        canWrite={canWrite}
        signedUrl={facingTarget ? signedUrls[facingTarget.rayon.id] ?? null : null}
        pending={saving === "facing"}
        onClose={() => setFacingTarget(null)}
        onSave={saveFacingAction}
      />

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === "universe" ? "Supprimer cet univers ?" : "Supprimer ce rayon ?"}
        description={
          deleteTarget?.kind === "universe"
            ? `L'univers "${deleteTarget.universe.name}" et ses ${deleteTarget.universe.rayons.length} rayons seront supprimés définitivement.`
            : deleteTarget?.kind === "rayon"
              ? `Le rayon "${deleteTarget.rayon.name}" sera supprimé définitivement.`
              : ""
        }
        pending={saving === "universe" || saving === "rayon"}
        confirmLabel={deleteTarget?.kind === "universe" ? "Supprimer l’univers" : "Supprimer le rayon"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "universe") {
            void deleteUniverseAction(deleteTarget.universe);
          } else {
            void deleteRayonAction(deleteTarget.rayon);
          }
        }}
      />

      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 28,
          transform: toast ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)",
          opacity: toast ? 1 : 0,
          transition: "all 0.2s ease",
          pointerEvents: "none",
          background: "#13243b",
          color: "#fff",
          borderRadius: 10,
          padding: "10px 16px",
          fontSize: 12,
          fontWeight: 700,
          zIndex: 500,
        }}
      >
        {toast}
      </div>
    </div>
  );
}

function UniverseCard(props: {
  universe: RayonUniverse;
  open: boolean;
  canWrite: boolean;
  renaming: boolean;
  renameValue: string;
  signedUrls: Record<string, string>;
  onToggle: () => void;
  onStartRename: () => void;
  onRenameChange: (value: string) => void;
  onRenameCancel: () => void;
  onRenameSubmit: () => void;
  onAddRayon: () => void;
  onDeleteUniverse: () => void;
  onOpenFacing: (rayon: RayonPlanItem) => void;
  onDeleteRayon: (rayon: RayonPlanItem) => void;
}) {
  const facingCount = props.universe.rayons.filter((rayon) => Boolean(rayon.facing_image_url)).length;
  return (
    <Card
      static
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${props.universe.color}44`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div
        onClick={props.onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          cursor: "pointer",
          borderBottom: props.open ? `1px solid ${props.universe.color}33` : "none",
          background: `linear-gradient(135deg, ${props.universe.color}16 0%, ${props.universe.color}0f 58%, #ffffff 100%)`,
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `${props.universe.color}22` }}>{props.universe.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {props.renaming ? (
            <input
              autoFocus
              value={props.renameValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => props.onRenameChange(event.target.value)}
              onBlur={props.onRenameSubmit}
              onKeyDown={(event) => {
                if (event.key === "Enter") props.onRenameSubmit();
                if (event.key === "Escape") props.onRenameCancel();
              }}
              style={{ minHeight: 36, width: "100%", maxWidth: 320, borderRadius: 10, border: "1px solid #d5d9e6", padding: "0 10px", fontFamily: "Fraunces, serif", fontSize: 18, color: props.universe.color }}
            />
          ) : (
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: props.universe.color }}>{props.universe.name}</div>
          )}
          <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>{props.universe.rayons.length} rayons · {facingCount} avec facing</div>
        </div>
        {props.canWrite ? (
          <div onClick={(event) => event.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={props.onAddRayon} style={compactButton}>+ Rayon</button>
            <button type="button" onClick={props.onStartRename} style={compactButton}>✏️</button>
            <button type="button" onClick={props.onDeleteUniverse} style={{ ...compactButton, color: "#d40511" }}>🗑</button>
          </div>
        ) : null}
        <span style={{ fontSize: 12, color: "#a8b0c8", transform: props.open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>▼</span>
      </div>
      {props.open ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, padding: 18 }}>
          {props.universe.rayons.map((rayon) => (
            <RayonCard key={rayon.id} rayon={rayon} signedUrl={props.signedUrls[rayon.id] ?? null} canWrite={props.canWrite} onOpen={() => props.onOpenFacing(rayon)} onDelete={() => props.onDeleteRayon(rayon)} />
          ))}
          {props.canWrite ? (
            <button type="button" onClick={props.onAddRayon} style={addRayonStyle}>
              <span style={{ fontSize: 22 }}>＋</span>
              Ajouter un rayon
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function RayonCard({ rayon, signedUrl, canWrite, onOpen, onDelete }: { rayon: RayonPlanItem; signedUrl: string | null; canWrite: boolean; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      style={{ textAlign: "left", borderRadius: 12, border: "1px solid #eaecf2", background: "#fff", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", padding: 0 }}
    >
      <div style={{ height: 110, position: "relative", overflow: "hidden", background: "#f4f6f9" }}>
        {signedUrl ? <img src={signedUrl} alt={rayon.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", gap: 6, color: "#a8b0c8", fontSize: 11, fontWeight: 700 }}><span style={{ fontSize: 24 }}>📷</span>Pas de facing</div>}
        <div style={{ position: "absolute", top: 6, right: 6, minHeight: 22, display: "inline-flex", alignItems: "center", padding: "0 8px", borderRadius: 999, background: signedUrl ? "#dcfce7" : "#fef3c7", color: signedUrl ? "#16a34a" : "#d97706", fontSize: 10, fontWeight: 800 }}>
          {signedUrl ? "✓ Facing" : "À ajouter"}
        </div>
      </div>
      <div style={{ display: "grid", gap: 6, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: rayon.color, flexShrink: 0 }} />
          <span>{rayon.name}</span>
        </div>
        <div style={{ fontSize: 11, color: "#a8b0c8" }}>{rayon.elem_count} éléments</div>
        {rayon.updated_at ? <div style={{ fontSize: 11, color: "#64748b" }}>Modifié le {new Date(rayon.updated_at).toLocaleDateString("fr-FR")} par {rayon.updater_name ?? "inconnu"}</div> : null}
        {canWrite ? (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <span style={actionPillStyle}>📷 Facing</span>
            <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} style={{ ...actionPillStyle, color: "#d40511", cursor: "pointer" }}>🗑</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {[0, 1].map((key) => (
        <div key={key} style={{ borderRadius: 18, border: "1px solid #eaecf2", background: "#fff", overflow: "hidden" }}>
          <div style={{ height: 74, background: "linear-gradient(90deg,#f4f6f9,#eef2f7,#f4f6f9)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, padding: 18 }}>
            {[0, 1, 2, 3].map((cell) => <div key={cell} style={{ height: 190, borderRadius: 14, background: "#f4f6f9" }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card static style={{ borderRadius: 18, border: "1px solid #fecaca", background: "#fff", padding: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#991b1b" }}>Impossible de charger les plans rayon</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#7f1d1d" }}>{message}</div>
      <button type="button" onClick={onRetry} style={{ ...primaryButtonStyle, marginTop: 14 }}>Réessayer</button>
    </Card>
  );
}

const primaryButtonStyle: CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  padding: "0 14px",
  cursor: "pointer",
};

const addUniverseStyle: CSSProperties = {
  minHeight: 80,
  borderRadius: 16,
  border: "2px dashed #d5d9e6",
  background: "#fff",
  color: "#a8b0c8",
  display: "grid",
  placeItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const addRayonStyle: CSSProperties = {
  minHeight: 180,
  borderRadius: 12,
  border: "2px dashed #d5d9e6",
  background: "#fff",
  color: "#a8b0c8",
  display: "grid",
  placeItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const actionPillStyle: CSSProperties = {
  minHeight: 26,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 8px",
  borderRadius: 999,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
};

function DeleteConfirmModal({
  open,
  title,
  description,
  pending,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  pending: boolean;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div style={deleteOverlayStyle}>
      <div style={deleteModalStyle}>
        <div style={deleteBadgeStyle}>Suppression</div>
        <h3 style={deleteTitleStyle}>{title}</h3>
        <p style={deleteTextStyle}>{description}</p>
        <div style={deleteFooterStyle}>
          <button type="button" onClick={onClose} style={deleteGhostStyle}>
            Annuler
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} style={deleteConfirmStyle(pending)}>
            {pending ? "Suppression..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const deleteOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 600,
  padding: 20,
};

const deleteModalStyle: CSSProperties = {
  width: 460,
  maxWidth: "95vw",
  borderRadius: 18,
  border: "1px solid #fecaca",
  background: "#fff",
  padding: 24,
  boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
  display: "grid",
  gap: 16,
};

const deleteBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff1f2",
  color: "#d40511",
  fontSize: 11,
  fontWeight: 800,
  width: "fit-content",
};

const deleteTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontFamily: "Fraunces, serif",
  color: "#13243b",
};

const deleteTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.6,
};

const deleteFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const deleteGhostStyle: CSSProperties = {
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
  padding: "0 14px",
};

const deleteConfirmStyle = (disabled: boolean): CSSProperties => ({
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontWeight: 800,
  padding: "0 14px",
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

function warmImage(url: string) {
  if (typeof window === "undefined") return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function invalidatePlansRayonUniverseCache() {
  plansRayonViewCache.universes = null;
  plansRayonViewCache.universesFetchedAt = 0;
}

function invalidatePlansRayonCache() {
  invalidatePlansRayonUniverseCache();
  plansRayonViewCache.signedUrls = {};
  plansRayonViewCache.signedUrlsFetchedAt = {};
}
