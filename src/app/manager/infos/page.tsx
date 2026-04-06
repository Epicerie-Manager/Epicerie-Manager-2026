"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  InfoAnnouncement,
  InfoAnnouncementAudience,
  InfoAnnouncementPriority,
  InfoAnnouncementTargeting,
  InfoCategory,
  InfoCategoryId,
} from "@/lib/infos-data";
import {
  addAnnouncementToSupabase,
  addDocumentToSupabase,
  getInfoAnnouncementAudience,
  getInfosUpdatedEventName,
  isInfoAnnouncementActiveNow,
  loadInfoAnnouncements,
  loadInfoCategories,
  removeAnnouncementFromSupabase,
  syncInfosFromSupabase,
} from "@/lib/infos-store";

const PRIORITY_META: Record<InfoAnnouncementPriority, { label: string; bg: string; color: string }> = {
  urgent: { label: "Urgent", bg: "#fff1f2", color: "#9f1239" },
  important: { label: "Important", bg: "#fffbeb", color: "#92400e" },
  normal: { label: "Info", bg: "#eff6ff", color: "#1e40af" },
};

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 16px 40px rgba(17,24,39,0.08)",
  };
}

function metricTileStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: "#fffdfb",
    border: "1px solid rgba(230,220,212,0.92)",
    boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
  };
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTargetingLabel(announcement: InfoAnnouncement) {
  if (announcement.targeting === "employees") {
    return `${announcement.targetEmployeeIds.length} collaborateur(s)`;
  }
  if (announcement.targeting === "rayons") {
    return `${announcement.targetRayons.length} rayon(s)`;
  }
  return "Toute l'équipe";
}

export default function ManagerInfosPage() {
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [audience, setAudience] = useState<InfoAnnouncementAudience>({ employees: [], dashboardUsers: [], rayons: [] });
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<InfoAnnouncementPriority>("normal");
  const [announcementTargeting, setAnnouncementTargeting] = useState<InfoAnnouncementTargeting>("all");
  const [announcementEmployeeIds, setAnnouncementEmployeeIds] = useState<string[]>([]);
  const [announcementRayons, setAnnouncementRayons] = useState<string[]>([]);
  const [announcementPublishAt, setAnnouncementPublishAt] = useState("");
  const [announcementExpireAt, setAnnouncementExpireAt] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCategories(loadInfoCategories());
      setAnnouncements(loadInfoAnnouncements());
    };

    const refreshAudience = async () => {
      try {
        setAudience(await getInfoAnnouncementAudience());
      } catch {
        setAudience({ employees: [], dashboardUsers: [], rayons: [] });
      }
    };

    refresh();
    void syncInfosFromSupabase().then(() => refresh());
    void refreshAudience();

    const eventName = getInfosUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, []);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const activeAnnouncements = announcements.filter((announcement) => isInfoAnnouncementActiveNow(announcement));

  const totalDocs = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );

  const handleSaveDocument = async () => {
    if (!activeCategory || !docTitle.trim()) {
      setError("Titre document obligatoire.");
      return;
    }
    try {
      setSavingDoc(true);
      setError("");
      setSuccess("");
      await addDocumentToSupabase(activeCategory.id, docTitle.trim(), docDescription.trim(), docFile ?? undefined);
      setDocTitle("");
      setDocDescription("");
      setDocFile(null);
      setSuccess("Document ajouté avec succès.");
      setCategories(loadInfoCategories());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible d'ajouter le document.");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      setError("Titre et contenu obligatoires.");
      return;
    }
    try {
      setSavingAnnouncement(true);
      setError("");
      setSuccess("");
      await addAnnouncementToSupabase({
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        priority: announcementPriority,
        publishAt: announcementPublishAt ? new Date(announcementPublishAt).toISOString() : null,
        expiresAt: announcementExpireAt ? new Date(announcementExpireAt).toISOString() : null,
        targeting: announcementTargeting,
        targetEmployeeIds: announcementEmployeeIds,
        targetRayons: announcementRayons,
        confirmationRequired: true,
      });
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementPriority("normal");
      setAnnouncementTargeting("all");
      setAnnouncementEmployeeIds([]);
      setAnnouncementRayons([]);
      setAnnouncementPublishAt("");
      setAnnouncementExpireAt("");
      setSuccess("Annonce publiée avec succès.");
      setAnnouncements(loadInfoAnnouncements());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de publier l'annonce.");
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const removeAnnouncement = async (id: string) => {
    try {
      setRemovingId(id);
      setError("");
      await removeAnnouncementFromSupabase(id);
      setAnnouncements(loadInfoAnnouncements());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de supprimer l'annonce.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a16207" }}>
            Communication manager
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.06em", color: "#111827" }}>
            Infos & documents
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Publier une annonce, ajouter un document utile et suivre ce qui est actuellement en ligne.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Documents</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#111827" }}>{totalDocs}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Annonces actives</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#a16207" }}>{activeAnnouncements.length}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Catégories</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#0f766e" }}>{categories.length}</div>
        </div>
      </div>

      {error ? <div style={{ ...shellCard(), color: "#b91c1c", fontSize: 13 }}>{error}</div> : null}
      {success ? <div style={{ ...shellCard(), color: "#166534", fontSize: 13 }}>{success}</div> : null}

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a16207" }}>
            Nouvelle annonce
          </div>
          <input
            value={announcementTitle}
            onChange={(event) => setAnnouncementTitle(event.target.value)}
            placeholder="Titre annonce"
            style={{ minHeight: 48, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
          />
          <textarea
            value={announcementContent}
            onChange={(event) => setAnnouncementContent(event.target.value)}
            rows={4}
            placeholder="Contenu"
            style={{ borderRadius: 18, border: "1px solid #d8d1c8", padding: "12px 14px", fontSize: 14, resize: "vertical", background: "#fff" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <select
              value={announcementPriority}
              onChange={(event) => setAnnouncementPriority(event.target.value as InfoAnnouncementPriority)}
              style={{ minHeight: 46, minWidth: 0, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
            >
              <option value="normal">Info</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={announcementTargeting}
              onChange={(event) => setAnnouncementTargeting(event.target.value as InfoAnnouncementTargeting)}
              style={{ minHeight: 46, minWidth: 0, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
            >
              <option value="all">Toute l&apos;équipe</option>
              <option value="employees">Collaborateurs ciblés</option>
              <option value="rayons">Rayons ciblés</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              Dates de validité de l&apos;annonce : à partir de quand elle devient visible, puis jusqu&apos;à quand elle reste affichée.
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Visible à partir du
                </span>
                <input
                  type="datetime-local"
                  value={announcementPublishAt}
                  onChange={(event) => setAnnouncementPublishAt(event.target.value)}
                  style={{ minHeight: 46, minWidth: 0, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Visible jusqu&apos;au
                </span>
                <input
                  type="datetime-local"
                  value={announcementExpireAt}
                  onChange={(event) => setAnnouncementExpireAt(event.target.value)}
                  style={{ minHeight: 46, minWidth: 0, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
                />
              </label>
            </div>
          </div>

          {announcementTargeting === "employees" ? (
            <div style={{ display: "grid", gap: 8 }}>
              {audience.employees.slice(0, 10).map((employee) => {
                const active = announcementEmployeeIds.includes(employee.id);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() =>
                      setAnnouncementEmployeeIds((current) =>
                        active ? current.filter((id) => id !== employee.id) : [...current, employee.id],
                      )
                    }
                    style={{
                      minHeight: 40,
                      borderRadius: 16,
                      border: `1px solid ${active ? "#93c5fd" : "#d8d1c8"}`,
                      background: active ? "#eff6ff" : "#fff",
                      color: active ? "#1d4ed8" : "#374151",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "left",
                      padding: "0 12px",
                    }}
                  >
                    {employee.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {announcementTargeting === "rayons" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {audience.rayons.slice(0, 12).map((rayon) => {
                const active = announcementRayons.includes(rayon);
                return (
                  <button
                    key={rayon}
                    type="button"
                    onClick={() =>
                      setAnnouncementRayons((current) =>
                        active ? current.filter((entry) => entry !== rayon) : [...current, rayon],
                      )
                    }
                    style={{
                      minHeight: 40,
                      borderRadius: 16,
                      border: `1px solid ${active ? "#93c5fd" : "#d8d1c8"}`,
                      background: active ? "#eff6ff" : "#fff",
                      color: active ? "#1d4ed8" : "#374151",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {rayon}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            disabled={savingAnnouncement}
            onClick={handleSaveAnnouncement}
            style={{
              minHeight: 48,
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #a16207, #f59e0b)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              opacity: savingAnnouncement ? 0.7 : 1,
            }}
          >
            {savingAnnouncement ? "Publication..." : "Publier l'annonce"}
          </button>
        </div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e" }}>
            Ajouter un document
          </div>
          <select
            value={activeCategoryId}
            onChange={(event) => setActiveCategoryId(event.target.value as InfoCategoryId)}
            style={{ minHeight: 46, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            value={docTitle}
            onChange={(event) => setDocTitle(event.target.value)}
            placeholder="Titre document"
            style={{ minHeight: 46, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
          />
          <textarea
            value={docDescription}
            onChange={(event) => setDocDescription(event.target.value)}
            rows={3}
            placeholder="Résumé rapide"
            style={{ borderRadius: 18, border: "1px solid #d8d1c8", padding: "12px 14px", fontSize: 14, resize: "vertical", background: "#fff" }}
          />
          <input
            type="file"
            onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
            style={{ fontSize: 13, color: "#374151" }}
          />
          <button
            type="button"
            disabled={savingDoc}
            onClick={handleSaveDocument}
            style={{
              minHeight: 48,
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #0f766e, #14b8a6)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              opacity: savingDoc ? 0.7 : 1,
            }}
          >
            {savingDoc ? "Ajout..." : "Ajouter le document"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280", paddingInline: 4 }}>
          Fil manager
        </div>
        {announcements.length ? (
          announcements.map((announcement) => {
            const priority = PRIORITY_META[announcement.priority];
            const active = isInfoAnnouncementActiveNow(announcement);
            return (
              <div key={announcement.id} style={shellCard()}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", color: "#111827" }}>
                        {announcement.title}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                        {getTargetingLabel(announcement)}
                        {announcement.publishAt ? ` · ${formatDateTimeLabel(announcement.publishAt)}` : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: "7px 10px",
                        background: priority.bg,
                        color: priority.color,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {priority.label}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }}>
                    {announcement.content}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <div style={metricTileStyle()}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Diffusion</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: active ? "#166534" : "#92400e" }}>
                        {active ? "En ligne" : "Planifiée / terminée"}
                      </div>
                    </div>
                    <div style={metricTileStyle()}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Ouvertures</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: "#111827" }}>
                        {announcement.recipients.filter((recipient) => recipient.seenAt).length}/{announcement.recipients.length || 0}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={removingId === announcement.id}
                    onClick={() => removeAnnouncement(announcement.id)}
                    style={{
                      minHeight: 42,
                      borderRadius: 16,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontSize: 12,
                      fontWeight: 800,
                      opacity: removingId === announcement.id ? 0.6 : 1,
                    }}
                  >
                    Supprimer l&apos;annonce
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={shellCard()}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Aucune annonce manager pour le moment.</div>
          </div>
        )}
      </div>
    </section>
  );
}
