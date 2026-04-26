"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { MonitoringSection } from "@/components/admin/monitoring-section";
import { SessionList } from "@/components/admin/session-list";
import { buildRecentSessions } from "@/components/admin/monitoring-section-kit";
import { ModuleSelector } from "@/components/rh/ModuleSelector";
import { moduleThemes } from "@/lib/theme";
import { isAdminUser } from "@/lib/admin-access";
import { ALL_MODULES, type ModulePermissions } from "@/lib/modules-config";
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

type AdminOfficeEmployee = {
  id: string;
  name: string;
  actif: boolean;
  rh_status: string;
  type: string;
};

type AdminOfficeProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id: string | null;
  allowed_modules: string[];
  module_permissions: ModulePermissions;
  password_changed: boolean;
  has_office_access: boolean;
};

type OfficeAccessFormState = {
  profileId: string | null;
  employeeId: string | null;
  fullName: string;
  email: string;
  role: "manager" | "custom_access" | "viewer";
  modulePermissions: ModulePermissions;
};

type AdminAudienceTargeting = InfoAnnouncementTargeting;

const PRIORITY_META: Record<InfoAnnouncementPriority, { label: string; bg: string; text: string; border: string }> = {
  urgent: { label: "Urgent", bg: "var(--admin-bg-red)", text: "#ff8f8a", border: "var(--admin-border-red)" },
  important: { label: "Important", bg: "var(--admin-bg-amber)", text: "#efc869", border: "var(--admin-border-amber)" },
  normal: { label: "Info", bg: "var(--admin-bg-blue)", text: "#8cc8ff", border: "var(--admin-border-blue)" },
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
    border: "1px solid var(--admin-border)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
    background: "var(--admin-bg-surface)",
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
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

function getTargetingLabel(announcement: InfoAnnouncement) {
  if (announcement.targeting === "employees") {
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

const EMPTY_OFFICE_FORM: OfficeAccessFormState = {
  profileId: null,
  employeeId: null,
  fullName: "",
  email: "",
  role: "custom_access",
  modulePermissions: {},
};

const ADMIN_UI_BUILD = "1.2.1";

function getOfficeRoleLabel(role: string) {
  if (role === "manager") return "Manager complet";
  if (role === "viewer") return "Lecture seule";
  if (role === "gestionnaire") return "Gestionnaire";
  return "Accès personnalisé";
}

function buildReadOnlyPermissions(current: ModulePermissions) {
  return Object.fromEntries(
    Object.keys(current).map((moduleKey) => [moduleKey, "read"]),
  ) as ModulePermissions;
}

function getRhStatusLabel(value: string) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "COORDINATEUR") return "Coordinateur";
  if (normalized === "GESTIONNAIRE") return "Gestionnaire";
  if (normalized === "DIRECTRICE") return "Directrice";
  return "Collaborateur";
}

function getModulePermissionsStats(value: ModulePermissions) {
  let read = 0;
  let write = 0;
  Object.values(value).forEach((level) => {
    if (level === "write") write += 1;
    if (level === "read") read += 1;
  });
  return { read, write, total: read + write };
}

function sectionEyebrow(label: string, background: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 26,
    padding: "0 10px",
    borderRadius: 999,
    background,
    color,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
}

function kpiCardStyle(border: string, background: string): React.CSSProperties {
  return {
    ...shellCardStyle(),
    border,
    background,
    minHeight: 112,
  };
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
  const [targetRayons, setTargetRayons] = useState<string[]>([]);
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
  const [officeEmployees, setOfficeEmployees] = useState<AdminOfficeEmployee[]>([]);
  const [officeProfiles, setOfficeProfiles] = useState<AdminOfficeProfile[]>([]);
  const [officeBusy, setOfficeBusy] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [officeSuccess, setOfficeSuccess] = useState("");
  const [officeForm, setOfficeForm] = useState<OfficeAccessFormState>(EMPTY_OFFICE_FORM);
  const [resettingOfficeProfileId, setResettingOfficeProfileId] = useState<string | null>(null);
  const [officeEmployeeQuery, setOfficeEmployeeQuery] = useState("");
  const [officeProfileQuery, setOfficeProfileQuery] = useState("");
  const [showModuleMatrix, setShowModuleMatrix] = useState(true);
  const [monitoringRefreshedAt, setMonitoringRefreshedAt] = useState<string | null>(null);
  const [activeAdminView, setActiveAdminView] = useState("monitoring");
  const [adminSessionHistory, setAdminSessionHistory] = useState<ReturnType<typeof buildRecentSessions>>([]);

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
      void loadOfficeAccess().catch((error) => {
        setOfficeError(error instanceof Error ? error.message : "Impossible de charger les accès bureau.");
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

  useEffect(() => {
    if (!isAllowed) return;

    const loadSessionHistory = async () => {
      try {
        const response = await fetch("/api/admin/monitoring", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { recentSessionRows?: unknown[] };
        if (!response.ok) return;
        setAdminSessionHistory(buildRecentSessions(payload.recentSessionRows ?? []));
      } catch {
        // noop
      }
    };

    void loadSessionHistory();
    const handleRefresh = () => {
      void loadSessionHistory();
    };
    window.addEventListener("admin-refresh", handleRefresh);
    return () => window.removeEventListener("admin-refresh", handleRefresh);
  }, [isAllowed]);

  const activeMessages = useMemo(
    () => announcements.filter((announcement) => isInfoAnnouncementActiveNow(announcement)),
    [announcements],
  );

  const selectedEmployeesPreview = useMemo(
    () => audience.employees.filter((employee) => targetEmployeeIds.includes(employee.id)),
    [audience.employees, targetEmployeeIds],
  );

  const selectedRayonEmployeesPreview = useMemo(
    () =>
      audience.employees.filter((employee) =>
        employee.tgRayons.some((rayon) => targetRayons.includes(rayon)),
      ),
    [audience.employees, targetRayons],
  );

  const officeAccessProfiles = useMemo(
    () => officeProfiles.filter((profile) => profile.has_office_access),
    [officeProfiles],
  );

  const officeProfilesByEmployeeId = useMemo(
    () =>
      new Map(
        officeAccessProfiles
          .filter((profile) => profile.employee_id)
          .map((profile) => [String(profile.employee_id), profile] as const),
      ),
    [officeAccessProfiles],
  );

  const officeFormEmployeeOptions = useMemo(
    () => [...officeEmployees].sort((a, b) => a.name.localeCompare(b.name, "fr-FR")),
    [officeEmployees],
  );

  const filteredOfficeFormEmployeeOptions = useMemo(() => {
    const query = officeEmployeeQuery.trim().toLowerCase();
    if (!query) return officeFormEmployeeOptions;
    return officeFormEmployeeOptions.filter((employee) => {
      const statusLabel = getRhStatusLabel(employee.rh_status).toLowerCase();
      return employee.name.toLowerCase().includes(query) || statusLabel.includes(query);
    });
  }, [officeEmployeeQuery, officeFormEmployeeOptions]);

  const filteredOfficeAccessProfiles = useMemo(() => {
    const query = officeProfileQuery.trim().toLowerCase();
    if (!query) return officeAccessProfiles;
    return officeAccessProfiles.filter((profile) => {
      const linkedEmployee = officeEmployees.find((employee) => employee.id === profile.employee_id);
      const roleLabel = getOfficeRoleLabel(profile.role).toLowerCase();
      return (
        profile.full_name.toLowerCase().includes(query) ||
        profile.email.toLowerCase().includes(query) ||
        roleLabel.includes(query) ||
        (linkedEmployee?.name.toLowerCase().includes(query) ?? false)
      );
    });
  }, [officeProfileQuery, officeAccessProfiles, officeEmployees]);

  const adminNavItems = useMemo(
    () => [
      { id: "monitoring", label: "Monitoring", icon: "◈", badge: "1 alerte" },
      { id: "sessions", label: "Historique connexions", icon: "◷" },
      { id: "acces", label: "Acces bureau", icon: "◻" },
      { id: "messages", label: "Messages", icon: "✉" },
      { id: "maintenance", label: "Maintenance", icon: "⚙" },
      { id: "journal", label: "Journal", icon: "≡" },
    ],
    [],
  );

  const adminModuleItems = useMemo(
    () => [
      { label: "Planning", score: 92, status: "ok" as const },
      { label: "Ruptures", score: 61, status: "warn" as const },
      { label: "Balisage", score: 88, status: "ok" as const },
      { label: "RH / Suivis", score: 79, status: "ok" as const },
      { label: "Plans rayon", score: 95, status: "ok" as const },
      { label: "Plan de masse", score: 85, status: "ok" as const },
      { label: "Infos", score: 100, status: "ok" as const },
    ],
    [],
  );

  const adminInfrastructureItems = useMemo(
    () => [
      { label: "Supabase", status: "ok" as const },
      { label: "Vercel", status: "ok" as const },
      { label: "Backup CSV", status: "warn" as const, meta: "dim. 20/04" },
      { label: "Storage", status: "ok" as const },
      { label: "Edge Functions", status: "ok" as const, meta: "5 actives" },
    ],
    [],
  );

  async function loadOfficeAccess() {
    const response = await fetch("/api/admin/office-access", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      employees?: AdminOfficeEmployee[];
      profiles?: AdminOfficeProfile[];
    };

    if (!response.ok) {
      throw new Error(payload.error || "Impossible de charger les accès bureau.");
    }

    setOfficeEmployees(payload.employees ?? []);
    setOfficeProfiles(payload.profiles ?? []);
  }

  function hydrateOfficeForm(profile: AdminOfficeProfile) {
    const nextRole = profile.role === "manager" ? "manager" : profile.role === "viewer" ? "viewer" : "custom_access";
    setOfficeForm({
      profileId: profile.id,
      employeeId: profile.employee_id,
      fullName: profile.full_name,
      email: profile.email,
      role: nextRole,
      modulePermissions: profile.role === "manager"
        ? {}
        : nextRole === "viewer"
          ? buildReadOnlyPermissions(profile.module_permissions)
          : profile.module_permissions,
    });
    setOfficeError("");
    setOfficeSuccess("");
  }

  function startOfficeFormFromEmployee(employeeId: string | null) {
    if (!employeeId) {
      setOfficeForm((current) => ({
        ...EMPTY_OFFICE_FORM,
        fullName: current.profileId ? "" : current.fullName,
        email: current.profileId ? "" : current.email,
      }));
      setOfficeError("");
      setOfficeSuccess("");
      return;
    }

    const employee = officeEmployees.find((entry) => entry.id === employeeId);
    if (!employee) return;

    const existingProfile = officeProfilesByEmployeeId.get(employeeId);
    if (existingProfile) {
      hydrateOfficeForm(existingProfile);
      return;
    }

    setOfficeForm({
      profileId: null,
      employeeId,
      fullName: employee.name,
      email: "",
      role: "custom_access",
      modulePermissions: {},
    });
    setOfficeError("");
    setOfficeSuccess("");
  }

  async function submitOfficeAccess() {
    setOfficeBusy(true);
    setOfficeError("");
    setOfficeSuccess("");
    try {
      const normalizedPermissions = officeForm.role === "manager"
        ? {}
        : officeForm.role === "viewer"
          ? buildReadOnlyPermissions(officeForm.modulePermissions)
          : officeForm.modulePermissions;
      const payload = {
        employeeId: officeForm.employeeId,
        fullName: officeForm.fullName,
        email: officeForm.email,
        role: officeForm.role,
        module_permissions: normalizedPermissions,
      };
      const response = await fetch(
        officeForm.profileId
          ? `/api/admin/office-access/${officeForm.profileId}`
          : "/api/admin/office-access",
        {
          method: officeForm.profileId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        employees?: AdminOfficeEmployee[];
        profiles?: AdminOfficeProfile[];
      };
      if (!response.ok) {
        throw new Error(result.error || "Impossible d'enregistrer l'accès bureau.");
      }
      if (result.employees && result.profiles) {
        setOfficeEmployees(result.employees);
        setOfficeProfiles(result.profiles);
      } else {
        await loadOfficeAccess();
      }
      setOfficeSuccess(officeForm.profileId ? "Accès bureau mis à jour." : "Accès bureau créé.");
      setOfficeForm(EMPTY_OFFICE_FORM);
    } catch (error) {
      setOfficeError(error instanceof Error ? error.message : "Impossible d'enregistrer l'accès bureau.");
    } finally {
      setOfficeBusy(false);
    }
  }

  async function handleResetOfficePassword(profile: AdminOfficeProfile) {
    setResettingOfficeProfileId(profile.id);
    setOfficeError("");
    setOfficeSuccess("");
    try {
      const response = await fetch("/api/manager/reset-office-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profile.id,
          employee_name: profile.full_name,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; temporaryPassword?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Impossible de réinitialiser le mot de passe.");
      }
      setOfficeSuccess(`Mot de passe temporaire : ${payload.temporaryPassword ?? ""}`);
    } catch (error) {
      setOfficeError(error instanceof Error ? error.message : "Impossible de réinitialiser le mot de passe.");
    } finally {
      setResettingOfficeProfileId(null);
    }
  }

  function toggleEmployeeSelection(employeeId: string) {
    setTargetEmployeeIds((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId],
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
        targeting,
        targetEmployeeIds,
        targetRayons,
        confirmationRequired: false,
      });
      setAnnouncements(loadInfoAnnouncements());
      setTitle("");
      setContent("");
      setPriority("important");
      setTargeting("all");
      setPublishAt("");
      setExpiresAt("");
      setTargetEmployeeIds([]);
      setTargetRayons([]);
      setMessageSuccess("Message publié dans le fil d'informations.");
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
      <section className="admin-page" style={{ padding: 28 }}>
        <Card style={{ ...shellCardStyle(), padding: 24 }}>
          <div className="admin-kicker">admin</div>
          <h1 style={{ marginTop: 12, fontSize: 24, color: "var(--admin-text-primary)" }}>Chargement de l&apos;espace administrateur</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--admin-text-secondary)" }}>
            Vérification de l&apos;accès et préparation des outils.
          </p>
        </Card>
      </section>
    );
  }

  if (!isAllowed) {
    return (
      <section className="admin-page" style={{ padding: 28 }}>
        <Card style={{ ...shellCardStyle(), padding: 24 }}>
          <div className="admin-kicker">admin</div>
          <h1 style={{ marginTop: 12, fontSize: 24, color: "var(--admin-text-primary)" }}>Accès réservé</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--admin-text-secondary)", lineHeight: 1.55 }}>
            Cet espace n&apos;est visible que pour le compte administrateur configuré.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <AdminShell
      activeView={activeAdminView}
      onViewChange={setActiveAdminView}
      navItems={adminNavItems}
      modules={adminModuleItems}
      infrastructure={adminInfrastructureItems}
    >
      {activeAdminView === "monitoring" ? (
        <MonitoringSection officeProfiles={officeAccessProfiles} onRefreshedAtChange={setMonitoringRefreshedAt} />
      ) : null}

      {activeAdminView === "sessions" ? (
        <section className="admin-grid-1">
          <SessionList items={adminSessionHistory} />
        </section>
      ) : null}

      {activeAdminView === "acces" ? (
      <div id="acces" className="admin-grid-2" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <Card style={{ ...shellCardStyle(), padding: 22 }}>
          <div className="admin-kicker">acces bureau</div>
          <h2 style={{ marginTop: 10, fontSize: 18, color: "var(--admin-text-primary)" }}>Créer ou modifier un accès</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
            Ici, tu gères les accès bureau séparément du RH. Tu peux donner un accès à n&apos;importe quelle fiche RH, ou créer un compte externe qui n&apos;appartient pas à l&apos;équipe.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Recherche RH</span>
                <input
                  value={officeEmployeeQuery}
                  onChange={(event) => setOfficeEmployeeQuery(event.target.value)}
                  placeholder="Ex: abdou, coordinateur..."
                  className="admin-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Personne concernée</span>
                <select
                  value={officeForm.employeeId ?? ""}
                  onChange={(event) => startOfficeFormFromEmployee(event.target.value || null)}
                  className="admin-select"
                  style={{ minHeight: 40, fontSize: 13 }}
                >
                  <option value="">Personne externe à l&apos;équipe (pas dans RH)</option>
                  {filteredOfficeFormEmployeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · Statut RH : {getRhStatusLabel(employee.rh_status)}
                      {officeProfilesByEmployeeId.has(employee.id) ? " · accès bureau existant" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ fontSize: 11, color: "var(--admin-text-secondary)", marginTop: -2 }}>
              {filteredOfficeFormEmployeeOptions.length} profil(s) RH trouvé(s)
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.05fr 1.05fr 0.9fr" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Nom bureau</span>
                <input
                  value={officeForm.fullName}
                  onChange={(event) => setOfficeForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Ex: Camille Durand"
                  className="admin-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Email bureau</span>
                <input
                  value={officeForm.email}
                  onChange={(event) => setOfficeForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="prenom@ep.fr"
                  className="admin-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Niveau d&apos;accès bureau</span>
                <select
                  value={officeForm.role}
                  onChange={(event) => {
                    const nextRole = event.target.value as OfficeAccessFormState["role"];
                    setOfficeForm((current) => ({
                      ...current,
                      role: nextRole,
                      modulePermissions: nextRole === "manager"
                        ? {}
                        : nextRole === "viewer"
                          ? buildReadOnlyPermissions(current.modulePermissions)
                          : current.modulePermissions,
                    }));
                  }}
                  className="admin-select"
                  style={{ minHeight: 40, fontSize: 13 }}
                >
                  <option value="custom_access">Accès par modules</option>
                  <option value="viewer">Lecture seule</option>
                  <option value="manager">Accès complet manager</option>
                </select>
              </label>
            </div>

            {officeForm.employeeId ? (
              <div className="admin-note--info">
                Cette personne vient des fichiers RH. Tu peux donc lui ajouter un accès bureau même si son statut RH est <strong>{getRhStatusLabel(officeEmployees.find((employee) => employee.id === officeForm.employeeId)?.rh_status ?? "")}</strong>.
              </div>
            ) : (
              <div className="admin-note--warn">
                Compte externe : utile pour une directrice, un autre manager ou une personne qui n&apos;existe pas dans les fichiers RH.
              </div>
            )}

            {officeForm.role !== "manager" ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Modules autorisés
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModuleMatrix((current) => !current)}
                    style={{
                      minHeight: 28,
                      borderRadius: 999,
                      border: "1px solid var(--admin-border-strong)",
                      background: "transparent",
                      color: "var(--admin-text-secondary)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "0 10px",
                      cursor: "pointer",
                    }}
                  >
                    {showModuleMatrix ? "Masquer détail" : "Afficher détail"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--admin-text-secondary)" }}>
                  Lecture: <strong>{getModulePermissionsStats(officeForm.modulePermissions).read}</strong> · Ecriture:{" "}
                  <strong>{getModulePermissionsStats(officeForm.modulePermissions).write}</strong>
                </div>
                {showModuleMatrix ? (
                  <ModuleSelector
                    value={officeForm.role === "viewer" ? buildReadOnlyPermissions(officeForm.modulePermissions) : officeForm.modulePermissions}
                    onChange={(modules) => setOfficeForm((current) => ({
                      ...current,
                      modulePermissions: current.role === "viewer" ? buildReadOnlyPermissions(modules) : modules,
                    }))}
                    disabled={officeBusy}
                    compact
                  />
                ) : null}
              </div>
            ) : (
              <div className="admin-note--info">
                Le rôle manager garde l'accès complet à tous les modules bureau.
              </div>
            )}

            {officeError ? (
              <div className="admin-note--danger">
                {officeError}
              </div>
            ) : null}
            {officeSuccess ? (
              <div className="admin-note--success">
                {officeSuccess}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => void submitOfficeAccess()}
                disabled={officeBusy}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  border: `1px solid ${theme.color}`,
                  background: theme.color,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: officeBusy ? "not-allowed" : "pointer",
                  opacity: officeBusy ? 0.7 : 1,
                  padding: "0 14px",
                }}
              >
                {officeBusy ? "Enregistrement..." : officeForm.profileId ? "Mettre à jour" : "Créer l'accès"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfficeForm(EMPTY_OFFICE_FORM);
                  setOfficeError("");
                  setOfficeSuccess("");
                }}
                disabled={officeBusy}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  border: "1px solid var(--admin-border-strong)",
                  background: "transparent",
                  color: "var(--admin-text-secondary)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: officeBusy ? "not-allowed" : "pointer",
                  padding: "0 14px",
                }}
              >
                Réinitialiser le formulaire
              </button>
            </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <Card style={{ ...shellCardStyle(), padding: 22, alignSelf: "start", minHeight: 640 }}>
            <div className="admin-kicker">comptes bureau</div>
            <h2 style={{ marginTop: 10, fontSize: 22, color: "var(--admin-text-primary)" }}>Accès existants</h2>
            <p style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
              Liste des profils qui ont réellement un accès au dashboard bureau. Les profils RH sans modules n'apparaissent pas ici.
            </p>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              value={officeProfileQuery}
              onChange={(event) => setOfficeProfileQuery(event.target.value)}
              placeholder="Rechercher un accès (nom, email, rôle...)"
              className="admin-input"
              style={{ minHeight: 40, fontSize: 13 }}
            />
            {filteredOfficeAccessProfiles.length ? filteredOfficeAccessProfiles.map((profile) => {
              const linkedEmployee = officeEmployees.find((employee) => employee.id === profile.employee_id) ?? null;
              const moduleSummary = profile.role === "manager"
                ? "Tous les modules"
                : Object.entries(profile.module_permissions)
                    .map(([moduleKey, level]) => {
                      const moduleLabel = ALL_MODULES.find((moduleItem) => moduleItem.key === moduleKey)?.label ?? moduleKey;
                      return `${moduleLabel} (${level === "write" ? "écriture" : "lecture"})`;
                    })
                    .join(", ");

              return (
                <div key={profile.id} className="admin-list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <strong style={{ fontSize: 14, color: "var(--admin-text-primary)" }}>{profile.full_name}</strong>
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "var(--admin-bg-elevated)", color: "var(--admin-text-primary)" }}>
                          {getOfficeRoleLabel(profile.role)}
                        </span>
                        {linkedEmployee ? (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "rgba(63,185,80,0.16)", color: "#71d97d" }}>
                            Fiche RH liée · {linkedEmployee.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "rgba(210,153,34,0.16)", color: "#efc869" }}>
                            Personne externe à l'équipe
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>{profile.email}</div>
                      <div style={{ marginTop: 7, fontSize: 11, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                        {moduleSummary || "Aucun module configuré"}
                      </div>
                      {linkedEmployee ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                          Statut RH : {getRhStatusLabel(linkedEmployee.rh_status)}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => hydrateOfficeForm(profile)}
                        style={{
                          minHeight: 36,
                          borderRadius: 12,
                          border: "1px solid var(--admin-border-strong)",
                          background: "transparent",
                          color: "var(--admin-text-primary)",
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResetOfficePassword(profile)}
                        disabled={resettingOfficeProfileId === profile.id}
                        style={{
                          minHeight: 36,
                          borderRadius: 12,
                          border: `1px solid ${theme.color}`,
                          background: "rgba(55, 138, 221, 0.12)",
                          color: theme.color,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: resettingOfficeProfileId === profile.id ? "not-allowed" : "pointer",
                          opacity: resettingOfficeProfileId === profile.id ? 0.7 : 1,
                        }}
                      >
                        {resettingOfficeProfileId === profile.id ? "Reset..." : "Reset mot de passe"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="admin-empty">
                {officeAccessProfiles.length ? "Aucun résultat pour cette recherche." : "Aucun accès bureau configuré pour le moment."}
              </div>
            )}
          </div>
          </Card>
        </div>
      </div>
      ) : null}

      {activeAdminView === "messages" ? (
      <div style={{ display: "grid", gap: 24 }}>
        <div id="messages">
        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start" }}>
          <div className="admin-kicker">messages</div>
          <h2 style={{ marginTop: 10, fontSize: 22, color: "var(--admin-text-primary)" }}>Publier un message info</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
            Crée un message terrain puis suis au même endroit ceux qui sont encore actifs.
          </p>
          <div
            className="admin-note--info"
            style={{ marginTop: 10 }}
          >
            Ce message restera visible dans le fil Infos, sans popup automatique à la connexion.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre du message"
              className="admin-input"
              style={{ minHeight: 42, fontSize: 13 }}
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Contenu du message..."
              rows={4}
              className="admin-textarea"
              style={{ fontSize: 13 }}
            />
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Priorité</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as InfoAnnouncementPriority)}
                  className="admin-select"
                  style={{ minHeight: 40, fontSize: 13 }}
                >
                  <option value="normal">Info</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Ciblage</span>
                <select
                  value={targeting}
                  onChange={(event) => setTargeting(event.target.value as AdminAudienceTargeting)}
                  className="admin-select"
                  style={{ minHeight: 40, fontSize: 13 }}
                >
                  <option value="all">Toute l&apos;équipe</option>
                  <option value="employees">Collaborateurs ciblés</option>
                  <option value="rayons">Rayons ciblés</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Diffuser à partir de</span>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(event) => setPublishAt(event.target.value)}
                  className="admin-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                <span>Fin de diffusion</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="admin-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                />
              </label>
            </div>

            {targeting === "employees" ? (
              <div style={{ border: "1px solid var(--admin-border)", borderRadius: 12, padding: 10, background: "var(--admin-bg-base)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                          border: `1px solid ${active ? theme.color : "var(--admin-border-strong)"}`,
                          background: active ? "rgba(212,5,17,0.14)" : "var(--admin-bg-surface)",
                          color: active ? "#ff8f8a" : "var(--admin-text-primary)",
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
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                    Sélection : {selectedEmployeesPreview.slice(0, 4).map((employee) => employee.name).join(", ")}
                    {selectedEmployeesPreview.length > 4 ? ` +${selectedEmployeesPreview.length - 4}` : ""}
                  </div>
                ) : null}
              </div>
            ) : null}

            {targeting === "rayons" ? (
              <div style={{ border: "1px solid var(--admin-border)", borderRadius: 12, padding: 10, background: "var(--admin-bg-base)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                          border: `1px solid ${active ? theme.color : "var(--admin-border-strong)"}`,
                          background: active ? "rgba(212,5,17,0.14)" : "var(--admin-bg-surface)",
                          color: active ? "#ff8f8a" : "var(--admin-text-primary)",
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
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                    Exemple destinataires : {selectedRayonEmployeesPreview.slice(0, 3).map((employee) => employee.name).join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {messageError ? (
              <div className="admin-note--danger">
                {messageError}
              </div>
            ) : null}
            {messageSuccess ? (
              <div className="admin-note--success">
                {messageSuccess}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCreateMessage()}
              disabled={messageBusy}
              style={{
                minHeight: 46,
                borderRadius: 12,
                border: `1px solid ${theme.color}`,
                background: theme.color,
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: messageBusy ? "not-allowed" : "pointer",
                opacity: messageBusy ? 0.7 : 1,
              }}
            >
              {messageBusy ? "Publication..." : "Publier le message"}
            </button>
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-secondary)" }}>
                  Messages publiés
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--admin-text-secondary)" }}>
                  Lecture compacte des annonces encore actives.
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--admin-text-secondary)" }}>{activeMessages.length} actif(s)</div>
            </div>
            {activeMessages.length ? (
              activeMessages.slice(0, 6).map((announcement) => {
                const meta = PRIORITY_META[announcement.priority];
                const seenCount = announcement.recipients.filter((recipient) => recipient.seenAt).length;
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
                          <strong style={{ fontSize: 13, color: "var(--admin-text-primary)" }}>{announcement.title}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "var(--admin-bg-base)", color: meta.text }}>
                            {meta.label}
                          </span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: "var(--admin-text-secondary)" }}>
                          {announcement.date}
                          {announcement.publishAt ? ` · Début ${formatDateTimeLabel(announcement.publishAt)}` : ""}
                          {announcement.expiresAt ? ` · Fin ${formatDateTimeLabel(announcement.expiresAt)}` : ""}
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.55 }}>
                          {announcement.content}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--admin-text-primary)", padding: "3px 8px", borderRadius: 999, background: "var(--admin-bg-base)" }}>
                            {getTargetingLabel(announcement)}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--admin-text-primary)", padding: "3px 8px", borderRadius: 999, background: "var(--admin-bg-base)" }}>
                            {seenCount}/{announcement.recipients.length} vus
                          </span>
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
              <div className="admin-empty">
                Aucun message actif pour le moment.
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>
      ) : null}

      {activeAdminView === "maintenance" ? (
      <div className="admin-grid-3" style={{ alignItems: "start" }}>
        <div id="maintenance">
        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start" }}>
          <div className="admin-kicker">maintenance</div>
          <h2 style={{ marginTop: 10, fontSize: 22, color: "var(--admin-text-primary)" }}>Relances rapides</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
            Outils simples pour forcer une resynchronisation sans passer dans Supabase.
          </p>
          <p className="admin-mono" style={{ marginTop: 6, fontSize: 10, color: "var(--admin-text-muted)", lineHeight: 1.5 }}>
            Recharge les données Supabase dans votre session actuelle uniquement.
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
                  ? { bg: "var(--admin-bg-red)", border: "var(--admin-border-red)", text: "#ff8f8a" }
                  : result.status === "success"
                    ? { bg: "var(--admin-bg-green)", border: "var(--admin-border-green)", text: "#71d97d" }
                    : result.status === "running"
                      ? { bg: "var(--admin-bg-blue)", border: "var(--admin-border-blue)", text: "#8cc8ff" }
                      : { bg: "var(--admin-bg-base)", border: "var(--admin-border)", text: "var(--admin-text-primary)" };

              return (
                <div key={action.id} style={{ borderRadius: 16, border: `1px solid ${tone.border}`, background: tone.bg, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-text-primary)" }}>{action.label}</div>
                      <div style={{ marginTop: 3, fontSize: 11, color: "var(--admin-text-secondary)" }}>{action.detail}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runMaintenance(action.id)}
                      disabled={result.status === "running"}
                      style={{
                        minHeight: 36,
                        borderRadius: 999,
                        border: `1px solid ${theme.color}`,
                        background: result.status === "running" ? "var(--admin-bg-base)" : "rgba(212,5,17,0.14)",
                        color: "#ff8f8a",
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
      </div>
      ) : null}

      {activeAdminView === "journal" ? (
      <div className="admin-grid-3" style={{ alignItems: "start" }}>
        <div id="journal">
        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start", minHeight: 620 }}>
          <div className="admin-kicker">journal</div>
          <h2 style={{ marginTop: 10, fontSize: 22, color: "var(--admin-text-primary)" }}>Livraisons récentes</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
            Lecture rapide du changelog pour te souvenir de ce qui a été livré.
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 12,
              maxHeight: "min(68vh, 760px)",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {initialJournal.length ? (
              initialJournal.map((entry) => (
                <div key={`${entry.version}-${entry.date}`} className="admin-list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13, color: "var(--admin-text-primary)" }}>{entry.version}</strong>
                    <span style={{ fontSize: 11, color: "var(--admin-text-secondary)" }}>{entry.date}</span>
                  </div>
                  <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                    {entry.items.length ? (
                      entry.items.map((item) => (
                        <div key={item} style={{ display: "grid", gridTemplateColumns: "6px 1fr", gap: 8, alignItems: "start" }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.color, marginTop: 6 }} />
                          <span style={{ fontSize: 12, color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--admin-text-secondary)" }}>Pas de détail résumé pour cette version.</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                Journal indisponible pour le moment.
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>
      ) : null}
    </AdminShell>
  );
}
