"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { getCurrentPlateauWeek } from "@/lib/plateau-data";
import {
  getBestPlateauAssetForWeek,
  getPlateauAssetsUpdatedEventName,
  getPlateauAssetLookup,
  getSignedPlateauUrl,
  loadPlateauAssets,
  syncPlateauAssetsFromSupabase,
  type PlateauAssetKey,
} from "@/lib/plateau-store";

const PLATEAUX: Array<{ key: PlateauAssetKey; label: string }> = [
  { key: "A", label: "Plateau A" },
  { key: "B", label: "Plateau B" },
  { key: "C", label: "Plateau C" },
];

function ZoomablePlan({ image, label }: { image: string | null; label: string }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomLabel = `${Math.round(zoomLevel * 100)}%`;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || zoomLevel <= 1) return;
    event.preventDefault();
    const target = scrollRef.current;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: target.scrollLeft,
      startTop: target.scrollTop,
    };
    setIsDragging(true);
    target.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !dragStateRef.current) return;
    const drag = dragStateRef.current;
    if (drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const target = scrollRef.current;
    target.scrollLeft = drag.startLeft - (event.clientX - drag.startX);
    target.scrollTop = drag.startTop - (event.clientY - drag.startY);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    scrollRef.current?.releasePointerCapture?.(event.pointerId);
    dragStateRef.current = null;
    setIsDragging(false);
  };

  return (
    <>
      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${collabTheme.line}`,
          background: "#fff",
        }}
      >
        {image ? (
          <>
            <div style={{ padding: "12px 12px 0", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: collabTheme.muted }}>Zoom {zoomLabel}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 220px", justifyContent: "flex-end" }}>
                  <input
                    type="range"
                    min="0.6"
                    max="2.4"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(event) => setZoomLevel(Number(event.target.value))}
                    style={{ width: "min(280px,100%)", accentColor: collabTheme.accent }}
                  />
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${collabTheme.line}`,
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color: collabTheme.muted,
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={scrollRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              style={{
                overflow: "auto",
                maxHeight: "76vh",
                background: "#f5f7fb",
                padding: 12,
                cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                touchAction: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={label}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                style={{
                  width: `${zoomLevel * 100}%`,
                  maxWidth: "none",
                  minWidth: "100%",
                  display: "block",
                  borderRadius: 12,
                  boxShadow: "0 10px 24px rgba(15,23,42,0.16)",
                  userSelect: "none",
                }}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "40px 18px",
              textAlign: "center",
              color: collabTheme.muted,
              fontSize: 13,
            }}
          >
            Aucun plan disponible pour cette semaine et ce plateau.
          </div>
        )}
      </div>
    </>
  );
}

export default function CollabPlateauPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [selectedPlateau, setSelectedPlateau] = useState<PlateauAssetKey>("A");
  const [focusWeek] = useState(() => getCurrentPlateauWeek());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [assetsVersion, setAssetsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const profile = await getCollabProfile();
      if (!profile || profile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }

      await syncPlateauAssetsFromSupabase();
      if (cancelled) return;
      setLastRefreshAt(new Date());
      setReady(true);
    }

    void loadPage().catch(() => router.replace("/collab/login"));

    const eventName = getPlateauAssetsUpdatedEventName();
    const handleUpdate = () => setAssetsVersion((value) => value + 1);
    window.addEventListener(eventName, handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(eventName, handleUpdate);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      const assetLookup = getPlateauAssetLookup(loadPlateauAssets());
      const asset = getBestPlateauAssetForWeek(assetLookup, focusWeek, selectedPlateau);
      if (!asset?.filePath) {
        setImageUrl(null);
        return;
      }

      const signedUrl = await getSignedPlateauUrl(asset.filePath, 3600);
      if (!cancelled) {
        setImageUrl(signedUrl);
      }
    }

    void loadImage();
    return () => {
      cancelled = true;
    };
  }, [assetsVersion, focusWeek, selectedPlateau]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await syncPlateauAssetsFromSupabase();
      setAssetsVersion((value) => value + 1);
      setLastRefreshAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader
        title="Plans Plateau"
        subtitle={`Semaine ${focusWeek} · plan partagé`}
        showRefresh
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastRefreshAt={lastRefreshAt}
      />

      <SectionCard style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, color: collabTheme.muted }}>
          Retrouvez le plan PDF partagé pour la semaine en cours. Le zoom reste disponible comme côté manager.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATEAUX.map((plateau) => (
            <button
              key={plateau.key}
              type="button"
              onClick={() => setSelectedPlateau(plateau.key)}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: `1px solid ${selectedPlateau === plateau.key ? collabTheme.accent : collabTheme.line}`,
                background: selectedPlateau === plateau.key ? collabTheme.accent : "#fffdfb",
                color: selectedPlateau === plateau.key ? "#fff8f1" : collabTheme.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {plateau.label}
            </button>
          ))}
        </div>

        <ZoomablePlan image={imageUrl} label={`Semaine ${focusWeek} · ${PLATEAUX.find((plateau) => plateau.key === selectedPlateau)?.label || selectedPlateau}`} />
      </SectionCard>

      <CollabBottomNav />
    </CollabPage>
  );
}
