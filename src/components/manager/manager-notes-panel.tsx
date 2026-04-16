"use client";

import { useEffect, useState } from "react";
import {
  createManagerNote,
  deleteManagerNote,
  getManagerNotesUpdatedEventName,
  loadManagerNotes,
  updateManagerNoteStatus,
  type ManagerNote,
} from "@/lib/manager-notes-store";

type ManagerNotesPanelProps = {
  compact?: boolean;
  limit?: number;
  title?: string;
  description?: string;
  listMaxHeight?: number | null;
};

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManagerNotesPanel({
  compact = false,
  limit = 6,
  title = "Notes et taches",
  description = "Ajoute une note simple ou une tache a faire. La liste reste synchronisee entre le dashboard et Manager Terrain.",
  listMaxHeight = null,
}: ManagerNotesPanelProps) {
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [entryType, setEntryType] = useState<"note" | "task">("note");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const taskNotes = notes
    .filter((note) => note.entryType === "task")
    .sort((left, right) => {
      if (left.isDone !== right.isDone) return left.isDone ? 1 : -1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  const plainNotes = notes
    .filter((note) => note.entryType === "note")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  useEffect(() => {
    let cancelled = false;

    const loadPanel = async () => {
      try {
        if (!cancelled) {
          setLoading(true);
          setError("");
        }
        const rows = await loadManagerNotes(limit);
        if (!cancelled) setNotes(rows);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger les notes.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPanel();
    const eventName = getManagerNotesUpdatedEventName();
    const intervalId = window.setInterval(() => {
      void loadPanel();
    }, 60000);
    window.addEventListener(eventName, loadPanel);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(eventName, loadPanel);
    };
  }, [limit]);

  const handleCreate = async () => {
    if (!draft.trim() || saving) return;

    try {
      setSaving(true);
      setError("");
      const created = await createManagerNote(draft, entryType);
      setNotes((current) => [created, ...current].slice(0, limit));
      setDraft("");
      setEntryType("note");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Impossible d'ajouter l'element.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDone = async (note: ManagerNote) => {
    if (note.entryType !== "task" || updatingId) return;

    try {
      setUpdatingId(note.id);
      setError("");
      const updated = await updateManagerNoteStatus(note.id, !note.isDone);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de mettre a jour la tache.");
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async (note: ManagerNote) => {
    if (deletingId || updatingId) return;

    try {
      setDeletingId(note.id);
      setError("");
      await deleteManagerNote(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setPendingDeleteId("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Impossible de supprimer l'element.");
    } finally {
      setDeletingId("");
    }
  };

  const renderNoteCard = (note: ManagerNote) => {
    const isTask = note.entryType === "task";
    const isUpdating = updatingId === note.id;
    const isPendingDelete = pendingDeleteId === note.id;
    const isDeleting = deletingId === note.id;
    const cardBorder = note.isDone ? "#bbf7d0" : isTask ? "#f1d5db" : "#e2e8f0";
    const cardBackground = note.isDone
      ? "linear-gradient(180deg, #f0fdf4 0%, #f7fee7 100%)"
      : isTask
        ? "linear-gradient(180deg, #fffdfb 0%, #fff8f7 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)";

    return (
      <div
        key={note.id}
        style={{
          borderRadius: 16,
          padding: "12px 14px",
          background: cardBackground,
          border: `1px solid ${cardBorder}`,
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "4px 9px",
                fontSize: 10,
                fontWeight: 700,
                background: isTask ? "#fff1f2" : "#eff6ff",
                color: isTask ? "#be123c" : "#1d4ed8",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {isTask ? "A faire" : "Note"}
            </span>
            {isTask ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  padding: "4px 9px",
                  fontSize: 10,
                  fontWeight: 700,
                  background: note.isDone ? "#dcfce7" : "#fff7ed",
                  color: note.isDone ? "#166534" : "#c2410c",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {note.isDone ? "Fait" : "En cours"}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isTask ? (
              <button
                type="button"
                onClick={() => void handleToggleDone(note)}
                disabled={Boolean(updatingId) || Boolean(deletingId)}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  padding: "0 12px",
                  border: note.isDone ? "1px solid #86efac" : "1px solid #fdba74",
                  background: note.isDone ? "#f0fdf4" : "#fff7ed",
                  color: note.isDone ? "#166534" : "#c2410c",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: isUpdating ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isUpdating ? "Mise a jour..." : note.isDone ? "Reouvrir" : "Cocher fait"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPendingDeleteId((current) => (current === note.id ? "" : note.id))}
              disabled={Boolean(updatingId) || Boolean(deletingId)}
              style={{
                minHeight: 32,
                borderRadius: 999,
                padding: "0 12px",
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#b91c1c",
                fontSize: 11,
                fontWeight: 800,
                cursor: isDeleting ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isPendingDelete ? "Annuler" : isDeleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>

        {isPendingDelete ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              borderRadius: 14,
              padding: "10px 12px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", lineHeight: 1.4 }}>
              {isTask ? "Supprimer cette tache ?" : "Supprimer cette note ?"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setPendingDeleteId("")}
                disabled={isDeleting}
                style={{
                  minHeight: 30,
                  borderRadius: 999,
                  padding: "0 12px",
                  border: "1px solid #fdba74",
                  background: "#fff",
                  color: "#9a3412",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: isDeleting ? "default" : "pointer",
                }}
              >
                Garder
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(note)}
                disabled={isDeleting}
                style={{
                  minHeight: 30,
                  borderRadius: 999,
                  padding: "0 12px",
                  border: "1px solid #f87171",
                  background: "#b91c1c",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: isDeleting ? "default" : "pointer",
                }}
              >
                {isDeleting ? "Suppression..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        ) : null}

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1f2937",
            lineHeight: 1.45,
            textDecoration: note.isDone ? "line-through" : "none",
            opacity: note.isDone ? 0.72 : 1,
          }}
        >
          {note.note}
        </div>

        <div style={{ fontSize: 10, color: "#64748b" }}>
          {note.authorName} · {formatNoteDate(note.createdAt)}
          {note.doneAt ? ` · fait le ${formatNoteDate(note.doneAt)}` : ""}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: compact ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.86)",
        border: compact ? "1px solid #dbe3eb" : "1px solid rgba(255,255,255,0.8)",
        borderRadius: compact ? 24 : 28,
        boxShadow: compact ? "0 16px 36px rgba(19,36,59,0.08)" : "0 16px 40px rgba(17,24,39,0.08)",
        padding: compact ? 18 : "16px 18px 16px",
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 14px",
              borderRadius: 10,
              background: "#fff1f2",
              color: "#be123c",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>Notes terrain</span>
          </div>
          <h2 style={{ margin: "10px 0 4px", fontSize: compact ? 21 : 20, fontWeight: 700, letterSpacing: "-0.03em", color: "#13243b" }}>
            {title}
          </h2>
          <div style={{ fontSize: compact ? 12 : 13, color: "#64748b", lineHeight: 1.5 }}>
            {description}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "note", label: "Note simple" },
            { id: "task", label: "A faire" },
          ].map((option) => {
            const active = entryType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setEntryType(option.id as "note" | "task")}
                style={{
                  minHeight: 34,
                  borderRadius: 999,
                  padding: "0 14px",
                  border: active ? "1px solid #be123c" : "1px solid #e2e8f0",
                  background: active ? "#fff1f2" : "#ffffff",
                  color: active ? "#be123c" : "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={entryType === "task" ? "Exemple : verifier le rayon biscuits avant 15h." : "Exemple : le facing du rayon cafe est a reprendre."}
          rows={compact ? 3 : 4}
          style={{
            width: "100%",
            resize: "vertical",
            borderRadius: 18,
            border: "1px solid rgba(230,220,212,0.95)",
            background: "#fffdfb",
            padding: "14px 14px",
            fontSize: 14,
            color: "#111827",
            lineHeight: 1.45,
            outline: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: error ? "#b91c1c" : "#94a3b8" }}>
            {error || "La meme liste est visible sur le dashboard et dans Manager Terrain."}
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !draft.trim()}
            style={{
              minHeight: 42,
              borderRadius: 999,
              padding: "0 18px",
              border: "none",
              background: saving || !draft.trim() ? "#cbd5e1" : "linear-gradient(135deg, #be123c, #ef4444)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              cursor: saving || !draft.trim() ? "default" : "pointer",
              boxShadow: saving || !draft.trim() ? "none" : "0 14px 28px rgba(190,24,93,0.24)",
            }}
          >
            {saving ? "Enregistrement..." : entryType === "task" ? "Ajouter la tache" : "Ajouter la note"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            maxHeight: listMaxHeight ? listMaxHeight : undefined,
            overflowY: listMaxHeight ? "auto" : undefined,
            paddingRight: listMaxHeight ? 4 : 0,
          }}
        >
          {loading ? <div style={{ fontSize: 12, color: "#64748b" }}>Chargement des notes...</div> : null}
          {!loading && !notes.length ? (
            <div
              style={{
                borderRadius: 16,
                padding: "14px 16px",
                background: "#fbfcfd",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Aucune note ou tache pour le moment.
            </div>
          ) : null}
          {!loading && taskNotes.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#be123c" }}>
                A faire
              </div>
              {taskNotes.map(renderNoteCard)}
            </div>
          ) : null}
          {!loading && plainNotes.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8" }}>
                Notes
              </div>
              {plainNotes.map(renderNoteCard)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
