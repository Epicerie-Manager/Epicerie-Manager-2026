"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { moduleThemes } from "@/lib/theme";
import { isAdminUser } from "@/lib/admin-access";
import {
  type InfoAnnouncement,
  type InfoAnnouncementAudience,
  type InfoAnnouncementPriority,
  type InfoAnnouncementTargeting,
} from "@/lib/infos-data";
import {
  addAnnouncementToSupabase,
  getInfoAnnouncementAudience,
  getInfosUpdatedEventName,
  isInfoAnnouncementActiveNow,
  loadInfoAnnouncements,
  removeAnnouncementFromSupabase,
  syncInfosFromSupabase,
} from "@/lib/infos-store";
import { createClient } from "@/lib/supabase";
import { syncAbsencesFromSupabase } from "@/lib/absences-store";
import { syncBalisageFromSupabase } from "@/lib/balisage-store";
import { getPlanningMonthKey, syncPlanningFromSupabase } from "@/lib/planning-store";
import { syncPresenceThresholdsFromSupabase } from "@/lib/presence-thresholds-store";
import { syncRhFromSupabase } from "@/lib/rh-store";

export type AdminJournalEntry = {
  version: string;
  date: string;
  items: string[];
};

type AdminAudienceTargeting = InfoAnnouncementTargeting | "dashboard";

const PRIORITY_META: Record<InfoAnnouncementPriority, { label: string; bg: string; text: string; border: string }> = {
  urgent: { label: "Urgent", bg: "#fff1f2", text: "#9f1239", border: "#fecdd3" },
  important: { label: "Important", bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  normal: { label: "Info", bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
};

type MaintenanceActionId =
  | "all"
  | "planning"
  | "absences"
  | "infos"
  | "rh"
  | "balisage"
  | "thresholds";

type MaintenanceResult = {
  status: "idle" | "running" | "success" | "error";
  message: string;
  ranAt: string | null;
};

const INITIAL_RESULT: MaintenanceResult = { status: "idle", message: "", ranAt: null };

function shellCardStyle(): React.CSSProperties {
  return {
    border: "1px solid #e8ecf1",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)",
    background: "rgba(255,255,255,0.96)",
    position: "relative",
    overflow: "hidden",
  };
}

function toIsoDateTime(value: string) {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
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

function getTargetingLabel(
  announcement: InfoAnnouncement,
  dashboardUsers: InfoAnnouncementAudience["dashboardUsers"],
) {
  const dashboardCount = dashboardUsers.filter((profile) => announcement.targetEmployeeIds.includes(profile.id)).length;
  if (announcement.targeting === "employees") {
    if (dashboardCount) {
      return `${dashboardCount} compte${dashboardCount > 1 ? "s" : ""} bureau`;
    }
    return `${announcement.recipients.length} collaborateur${announcement.recipients.length > 1 ? "s" : ""}`;
  }
  if (announcement.targeting === "rayons") {
    return `${announcement.targetRayons.length} rayon${announcement.targetRayons.length > 1 ? "s" : ""}`;
  }
  return "Toute l'équipe";
}

function formatMaintenanceTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPageClient({ initialJournal }: { initialJournal: AdminJournalEntry[] }) {
  const router = useRouter();
  const theme = moduleThemes.admin;
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [adminLabel, setAdminLabel] = useState("");
  const [audience, setAudience] = useState<InfoAnnouncementAudience>({ employees: [], dashboardUsers: [], rayons: [] });
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<InfoAnnouncementPriority>("important");
  const [targeting, setTargeting] = useState<AdminAudienceTargeting>("all");
  const [publishAt, setPublishAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [targetEmployeeIds, setTargetEmployeeIds] = useState<string[]>([]);
  const [targetDashboardUserIds, setTargetDashboardUserIds] = useState<string[]>([]);
  const [targetRayons, setTargetRayons] = useState<string[]>([]);
  const [showOnLogin, setShowOnLogin] = useState(true);
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");
  const [removingAnnouncementId, setRemovingAnnouncementId] = useState<string | null>(null);
  const [maintenanceResults, setMaintenanceResults] = useState<Record<MaintenanceActionId, MaintenanceResult>>({
    all: { ...INITIAL_RESULT },
    planning: { ...INITIAL_RESULT },
    absences: { ...INITIAL_RESULT },
    infos: { ...INITIAL_RESULT },
    rh: { ...INITIAL_RESULT },
    balisage: { ...INITIAL_RESULT },
    thresholds: { ...INITIAL_RESULT },
  });

  useEffect(() => {
    const refreshAnnouncements = () => {
      setAnnouncements(loadInfoAnnouncements());
    };

    const boot = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,role")
        .eq("id", user.id)
        .maybeSingle();

      const allowed = isAdminUser(user.email ?? null, String(profile?.role ?? ""));
      setAdminLabel(String(profile?.full_name ?? user.email ?? "").trim());
      setIsAllowed(allowed);

      if (!allowed) return;

      refreshAnnouncements();
      void syncInfosFromSupabase().then((synced) => {
        if (synced) refreshAnnouncements();
      });

      try {
        setAudience(await getInfoAnnouncementAudience());
      } catch {
        setAudience({ employees: [], dashboardUsers: [], rayons: [] });
      }
    };

    void boot();
    const eventName = getInfosUpdatedEventName();
    window.addEventListener(eventName, refreshAnnouncements);
    return () => window.removeEventListener(eventName, refreshAnnouncements);
  }, [router]);

  const loginMessages = useMemo(
    () =>
      announcements.filter(
        (announcement) => announcement.confirmationRequired && isInfoAnnouncementActiveNow(announcement),
      ),
    [announcements],
  );

  const activeMessages = useMemo(
    () => announcements.filter((announcement) => isInfoAnnouncementActiveNow(announcement)),
    [announcements],
  );

  const selectedEmployeesPreview = useMemo(
    () => audience.employees.filter((employee) => targetEmployeeIds.includes(employee.id)),
    [audience.employees, targetEmployeeIds],
  );

  const selectedDashboardUsersPreview = useMemo(
    () => audience.dashboardUsers.filter((profile) => targetDashboardUserIds.includes(profile.id)),
    [audience.dashboardUsers, targetDashboardUserIds],
  );

  const selectedRayonEmployeesPreview = useMemo(
    () =>
      audience.employees.filter((employee) =>
        employee.tgRayons.some((rayon) => targetRayons.includes(rayon)),
      ),
    [audience.employees, targetRayons],
  );

  function toggleEmployeeSelection(employeeId: string) {
    setTargetEmployeeIds((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId],
    );
  }

  function toggleDashboardUserSelection(profileId: string) {
    setTargetDashboardUserIds((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  function toggleRayonSelection(rayon: string) {
    setTargetRayons((current) =>
      current.includes(rayon) ? current.filter((entry) => entry !== rayon) : [...current, rayon],
    );
  }

  async function handleCreateMessage() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    setMessageError("");
    setMessageSuccess("");

    if (!trimmedTitle || !trimmedContent) {
      setMessageError("Le titre et le contenu sont obligatoires.");
      return;
    }
    if (targeting === "employees" && targetEmployeeIds.length === 0) {
      setMessageError("Sélectionne au moins un collaborateur ciblé.");
      return;
    }
    if (targeting === "dashboard" && targetDashboardUserIds.length === 0) {
      setMessageError("Sélectionne au moins un destinataire bureau.");
      return;
    }
    if (
      targeting === "dashboard" &&
      selectedDashboardUsersPreview.some((profile) => !profile.employeeId)
    ) {
      setMessageError("Chaque destinataire bureau doit etre relie a un collaborateur pour tracer le clic OK.");
      return;
    }
    if (targeting === "rayons" && targetRayons.length === 0) {
      setMessageError("Sélectionne au moins un rayon ciblé.");
      return;
    }

    const nextPublishAt = toIsoDateTime(publishAt);
    const nextExpiresAt = toIsoDateTime(expiresAt);
    if (nextPublishAt && nextExpiresAt && new Date(nextExpiresAt).getTime() <= new Date(nextPublishAt).getTime()) {
      setMessageError("La fin de diffusion doit être après le début.");
      return;
    }

    setMessageBusy(true);
    try {
      await addAnnouncementToSupabase({
        title: trimmedTitle,
        content: trimmedContent,
        priority,
        publishAt: nextPublishAt,
        expiresAt: nextExpiresAt,
        targeting: targeting === "dashboard" ? "employees" : targeting,
        targetEmployeeIds: targeting === "dashboard" ? targetDashboardUserIds : targetEmployeeIds,
        targetRayons,
        confirmationRequired: showOnLogin,
      });
      setAnnouncements(loadInfoAnnouncements());
      setTitle("");
      setContent("");
      setPriority("important");
      setTargeting("all");
      setPublishAt("");
      setExpiresAt("");
      setTargetEmployeeIds([]);
      setTargetDashboardUserIds([]);
      setTargetRayons([]);
      setShowOnLogin(true);
      setMessageSuccess(
        showOnLogin
          ? "Message publié. Il s'affichera à la connexion du collaborateur tant qu'il n'aura pas cliqué OK."
          : "Message publié dans le fil d'informations.",
      );
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Impossible de publier le message.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function handleRemoveMessage(announcementId: string) {
    setMessageError("");
    setMessageSuccess("");
    setRemovingAnnouncementId(announcementId);
    try {
      await removeAnnouncementFromSupabase(announcementId);
      setAnnouncements(loadInfoAnnouncements());
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Impossible de supprimer le message.");
    } finally {
      setRemovingAnnouncementId(null);
    }
  }

  async function runMaintenance(actionId: MaintenanceActionId) {
    const startedAt = new Date().toISOString();
    setMaintenanceResults((current) => ({
      ...current,
      [actionId]: {
        status: "running",
        message: "Synchronisation en cours...",
        ranAt: startedAt,
      },
    }));

    const run = async () => {
      if (actionId === "planning") {
        await syncPlanningFromSupabase(getPlanningMonthKey(new Date()));
        return "Planning resynchronisé.";
      }
      if (actionId === "absences") {
        await syncAbsencesFromSupabase();
        return "Absences resynchronisées.";
      }
      if (actionId === "infos") {
        await syncInfosFromSupabase();
        return "Infos et annonces resynchronisées.";
      }
      if (actionId === "rh") {
        await syncRhFromSupabase();
        return "RH resynchronisé.";
      }
      if (actionId === "balisage") {
        await syncBalisageFromSupabase();
        return "Balisage resynchronisé.";
      }
      if (actionId === "thresholds") {
        await syncPresenceThresholdsFromSupabase();
        return "Seuils de présence resynchronisés.";
      }

      await Promise.allSettled([
        syncPlanningFromSupabase(getPlanningMonthKey(new Date())),
        syncAbsencesFromSupabase(),
        syncInfosFromSupabase(),
        syncRhFromSupabase(),
        syncBalisageFromSupabase(),
        syncPresenceThresholdsFromSupabase(),
      ]);
      return "Tous les modules principaux ont été relancés.";
    };

    try {
      const message = await run();
      setAnnouncements(loadInfoAnnouncements());
      setMaintenanceResults((current) => ({
        ...current,
        [actionId]: {
          status: "success",
          message,
          ranAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      setMaintenanceResults((current) => ({
        ...current,
        [actionId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Erreur de maintenance.",
          ranAt: new Date().toISOString(),
        },
      }));
    }
  }

  if (isAllowed == null) {
    return (
      <section style={{ marginTop: 20 }}>
        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Admin" />
          <h1 style={{ marginTop: 6, fontSize: 24, color: "#0f172a" }}>Chargement de l&apos;espace administrateur</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
            Vérification de l&apos;accès et préparation des outils.
          </p>
        </Card>
      </section>
    );
  }

  if (!isAllowed) {
    return (
      <section style={{ marginTop: 20 }}>
        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Admin" />
          <h1 style={{ marginTop: 6, fontSize: 24, color: "#0f172a" }}>Accès réservé</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
            Cet espace n&apos;est visible que pour le compte administrateur configuré.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
      <Card style={shellCardStyle()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Kicker moduleKey="admin" label="Menu privé" />
            <h1 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.1, color: "#0f172a" }}>
              Admin bureau
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b", maxWidth: 760, lineHeight: 1.55 }}>
              Espace réservé à {adminLabel || "l'administrateur"} pour diffuser des messages à la connexion,
              relancer les synchronisations utiles et garder un petit journal des livraisons récentes.
            </p>
          </div>
          <div
            style={{
              borderRadius: 16,
              padding: "10px 12px",
              background: "linear-gradient(135deg,#f5f3ff,#eef4ff)",
              border: "1px solid #dbeafe",
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>
              Messages à la connexion
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#0f172a", lineHeight: 1.45 }}>
              Les messages avec validation obligatoire s&apos;ouvrent directement sur l&apos;accueil collaborateur.
            </div>
          </div>
        </div>
      </Card>

      <KPIRow>
        <KPI moduleKey="admin" value={activeMessages.length} label="Messages actifs" style={{ background: "linear-gradient(135deg,#fff7ed,#fffbf6)", border: "1px solid #fed7aa" }} valueColor="#c2410c" />
        <KPI moduleKey="admin" value={loginMessages.length} label="À la connexion" style={{ background: "linear-gradient(135deg,#eef4ff,#fbfdff)", border: "1px solid #bfdbfe" }} valueColor="#1d4ed8" />
        <KPI moduleKey="admin" value={audience.employees.length} label="Collaborateurs ciblables" style={{ background: "linear-gradient(135deg,#f0fdfa,#f8fffe)", border: "1px solid #99f6e4" }} valueColor="#0f766e" />
        <KPI moduleKey="admin" value={initialJournal.length} label="Entrées journal" style={{ background: "linear-gradient(135deg,#fdf4ff,#fcfaff)", border: "1px solid #e9d5ff" }} valueColor="#7c3aed" />
      </KPIRow>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)" }}>
        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Messages" />
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Messages à la connexion</h2>
            <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Ici seulement, tu peux choisir entre un message classique dans le fil d&apos;infos ou un message affiché directement à l&apos;ouverture avec bouton OK.
            </p>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre du message"
              style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Contenu du message"
              rows={4}
              style={{ borderRadius: 12, border: "1px solid #dbe3eb", padding: "10px 12px", fontSize: 13, resize: "vertical" }}
            />
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Priorité</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as InfoAnnouncementPriority)}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                >
                  <option value="normal">Info</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Ciblage</span>
                <select
                  value={targeting}
                  onChange={(event) => setTargeting(event.target.value as AdminAudienceTargeting)}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                >
                  <option value="all">Toute l&apos;équipe</option>
                  <option value="employees">Collaborateurs ciblés</option>
                  <option value="dashboard">Dashboard bureau</option>
                  <option value="rayons">Rayons ciblés</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Diffuser à partir de</span>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(event) => setPublishAt(event.target.value)}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Fin de diffusion</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
              <input
                type="checkbox"
                checked={showOnLogin}
                onChange={(event) => setShowOnLogin(event.target.checked)}
              />
              Message d&apos;ouverture avec clic OK obligatoire
            </label>

            {targeting === "employees" ? (
              <div style={{ border: "1px solid #dbe3eb", borderRadius: 12, padding: 10, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Collaborateurs ciblés
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {audience.employees.map((employee) => {
                    const active = targetEmployeeIds.includes(employee.id);
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => toggleEmployeeSelection(employee.id)}
                        style={{
                          minHeight: 30,
                          borderRadius: 999,
                          border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                          background: active ? theme.light : "#fff",
                          color: active ? theme.color : "#334155",
                          padding: "0 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {employee.name}
                      </button>
                    );
                  })}
                </div>
                {selectedEmployeesPreview.length ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                    Sélection : {selectedEmployeesPreview.slice(0, 4).map((employee) => employee.name).join(", ")}
                    {selectedEmployeesPreview.length > 4 ? ` +${selectedEmployeesPreview.length - 4}` : ""}
                  </div>
                ) : null}
              </div>
            ) : null}

            {targeting === "dashboard" ? (
              <div style={{ border: "1px solid #dbe3eb", borderRadius: 12, padding: 10, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Destinataires bureau
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {audience.dashboardUsers.map((profile) => {
                    const active = targetDashboardUserIds.includes(profile.id);
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => toggleDashboardUserSelection(profile.id)}
                        style={{
                          minHeight: 30,
                          borderRadius: 999,
                          border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                          background: active ? theme.light : "#fff",
                          color: active ? theme.color : "#334155",
                          padding: "0 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title={profile.email || profile.name}
                      >
                        {profile.name}
                      </button>
                    );
                  })}
                </div>
                {selectedDashboardUsersPreview.length ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                    Sélection : {selectedDashboardUsersPreview.map((profile) => profile.name).join(", ")}
                  </div>
                ) : null}
                {!audience.dashboardUsers.length ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                    Aucun autre compte bureau manager détecté pour l&apos;instant.
                  </div>
                ) : null}
              </div>
            ) : null}

            {targeting === "rayons" ? (
              <div style={{ border: "1px solid #dbe3eb", borderRadius: 12, padding: 10, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Rayons ciblés
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {audience.rayons.map((rayon) => {
                    const active = targetRayons.includes(rayon);
                    return (
                      <button
                        key={rayon}
                        type="button"
                        onClick={() => toggleRayonSelection(rayon)}
                        style={{
                          minHeight: 30,
                          borderRadius: 999,
                          border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                          background: active ? theme.light : "#fff",
                          color: active ? theme.color : "#334155",
                          padding: "0 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {rayon}
                      </button>
                    );
                  })}
                </div>
                {selectedRayonEmployeesPreview.length ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                    Exemple destinataires : {selectedRayonEmployeesPreview.slice(0, 3).map((employee) => employee.name).join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {messageError ? (
              <div style={{ borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, padding: "10px 12px" }}>
                {messageError}
              </div>
            ) : null}
            {messageSuccess ? (
              <div style={{ borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", fontSize: 12, padding: "10px 12px" }}>
                {messageSuccess}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCreateMessage()}
              disabled={messageBusy}
              style={{
                minHeight: 40,
                borderRadius: 10,
                border: `1px solid ${theme.color}`,
                background: theme.light,
                color: theme.color,
                fontWeight: 700,
                fontSize: 13,
                cursor: messageBusy ? "not-allowed" : "pointer",
                opacity: messageBusy ? 0.7 : 1,
              }}
            >
              {messageBusy ? "Publication..." : "Publier le message"}
            </button>
          </div>
        </Card>

        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Maintenance" />
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Relances rapides</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Outils simples pour forcer une resynchronisation sans passer dans Supabase.
          </p>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {[
              { id: "all" as const, label: "Tout resynchroniser", detail: "Planning, absences, infos, RH, balisage, seuils" },
              { id: "planning" as const, label: "Planning", detail: "Horaires, tri caddie et binômes" },
              { id: "absences" as const, label: "Absences", detail: "Demandes et statuts" },
              { id: "infos" as const, label: "Infos", detail: "Annonces et documents" },
              { id: "rh" as const, label: "RH", detail: "Fiches et statuts" },
              { id: "balisage" as const, label: "Balisage", detail: "Suivi mensuel" },
              { id: "thresholds" as const, label: "Seuils", detail: "Seuils de présence" },
            ].map((action) => {
              const result = maintenanceResults[action.id];
              const tone =
                result.status === "error"
                  ? { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" }
                  : result.status === "success"
                    ? { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" }
                    : result.status === "running"
                      ? { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" }
                      : { bg: "#fff", border: "#dbe3eb", text: "#334155" };

              return (
                <div key={action.id} style={{ borderRadius: 12, border: `1px solid ${tone.border}`, background: tone.bg, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{action.label}</div>
                      <div style={{ marginTop: 3, fontSize: 11, color: "#64748b" }}>{action.detail}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runMaintenance(action.id)}
                      disabled={result.status === "running"}
                      style={{
                        minHeight: 34,
                        borderRadius: 999,
                        border: `1px solid ${theme.color}`,
                        background: result.status === "running" ? "#fff" : theme.light,
                        color: theme.color,
                        padding: "0 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: result.status === "running" ? "not-allowed" : "pointer",
                        opacity: result.status === "running" ? 0.75 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.status === "running" ? "En cours..." : "Lancer"}
                    </button>
                  </div>
                  {result.message ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: tone.text, lineHeight: 1.45 }}>
                      {result.message}
                      {result.ranAt ? ` · ${formatMaintenanceTimestamp(result.ranAt)}` : ""}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)" }}>
        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Messages publiés" />
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Suivi rapide</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {activeMessages.length ? (
              activeMessages.slice(0, 10).map((announcement) => {
                const meta = PRIORITY_META[announcement.priority];
                const seenCount = announcement.recipients.filter((recipient) => recipient.seenAt).length;
                const confirmedCount = announcement.recipients.filter((recipient) => recipient.confirmedAt).length;

                return (
                  <div
                    key={announcement.id}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${meta.border}`,
                      background: meta.bg,
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>{announcement.title}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#fff", color: meta.text }}>
                            {meta.label}
                          </span>
                          {announcement.confirmationRequired ? (
                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#fff", color: "#1d4ed8" }}>
                              Connexion + OK
                            </span>
                          ) : null}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                          {announcement.date}
                          {announcement.publishAt ? ` · Début ${formatDateTimeLabel(announcement.publishAt)}` : ""}
                          {announcement.expiresAt ? ` · Fin ${formatDateTimeLabel(announcement.expiresAt)}` : ""}
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
                          {announcement.content}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", padding: "3px 8px", borderRadius: 999, background: "#fff" }}>
                            {getTargetingLabel(announcement, audience.dashboardUsers)}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", padding: "3px 8px", borderRadius: 999, background: "#fff" }}>
                            {seenCount}/{announcement.recipients.length} vus
                          </span>
                          {announcement.confirmationRequired ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", padding: "3px 8px", borderRadius: 999, background: "#fff" }}>
                              {confirmedCount}/{announcement.recipients.length} OK
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMessage(announcement.id)}
                        disabled={removingAnnouncementId === announcement.id}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#b91c1c",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: removingAnnouncementId === announcement.id ? "not-allowed" : "pointer",
                          opacity: removingAnnouncementId === announcement.id ? 0.7 : 1,
                        }}
                      >
                        {removingAnnouncementId === announcement.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ borderRadius: 14, border: "1px solid #dbe3eb", background: "#f8fafc", padding: 14, fontSize: 12, color: "#64748b" }}>
                Aucun message actif pour le moment.
              </div>
            )}
          </div>
        </Card>

        <Card style={shellCardStyle()}>
          <Kicker moduleKey="admin" label="Journal" />
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Livraisons récentes</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Lecture rapide du changelog pour te souvenir de ce qui a été livré.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {initialJournal.length ? (
              initialJournal.map((entry) => (
                <div key={`${entry.version}-${entry.date}`} style={{ borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>{entry.version}</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{entry.date}</span>
                  </div>
                  <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                    {entry.items.length ? (
                      entry.items.map((item) => (
                        <div key={item} style={{ display: "grid", gridTemplateColumns: "6px 1fr", gap: 8, alignItems: "start" }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.color, marginTop: 6 }} />
                          <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: "#64748b" }}>Pas de détail résumé pour cette version.</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ borderRadius: 14, border: "1px solid #dbe3eb", background: "#f8fafc", padding: 14, fontSize: 12, color: "#64748b" }}>
                Journal indisponible pour le moment.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
