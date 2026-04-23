"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
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
    border: "1px solid #eef2f7",
    boxShadow: "0 2px 8px rgba(15,23,42,0.04), 0 20px 48px rgba(15,23,42,0.08)",
    background: "rgba(255,255,255,0.96)",
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
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
    <section style={{ display: "grid", gap: 24, marginTop: 20 }}>
      <Card style={{ ...shellCardStyle(), padding: 30 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionEyebrow("Menu privé", "#eef2ff", "#4f46e5")}>Menu privé</span>
              <span style={sectionEyebrow(`Build ${ADMIN_UI_BUILD}`, "#fff7ed", "#c2410c")}>Build {ADMIN_UI_BUILD}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.045em", color: "#0f172a" }}>
              Admin bureau
            </h1>
            <p style={{ margin: 0, maxWidth: 760, fontSize: 14, lineHeight: 1.65, color: "#64748b" }}>
              Espace réservé à {adminLabel || "l&apos;administrateur"} pour publier des annonces, gérer les accès bureau,
              relancer les synchronisations clés et suivre l&apos;historique des livraisons.
            </p>
          </div>

          <div
            style={{
              minWidth: 290,
              display: "grid",
              gap: 14,
              padding: 16,
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{adminLabel || "Administrateur"}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>Version locale identifiée · build {ADMIN_UI_BUILD}</div>
              </div>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: "#f8fafc",
                  border: "1px solid #dbeafe",
                  color: "#4f46e5",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {(adminLabel || "AD").split(" ").map((chunk) => chunk[0]).slice(0, 2).join("")}
              </div>
            </div>
            <div
              style={{
                borderRadius: 18,
                border: "1px solid #dbeafe",
                background: "linear-gradient(135deg,#f5f3ff,#eef4ff)",
                padding: 14,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>
                Messages infos
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "#0f172a" }}>
                Les annonces publiées ici restent dans le module Infos, sans popup automatique à l&apos;ouverture.
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <Card style={{ ...kpiCardStyle("1px solid #fed7aa", "linear-gradient(135deg,#fff7ed,#fffaf4)"), padding: 22 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "#c2410c" }}>{activeMessages.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Messages actifs</div>
          </div>
        </Card>
        <Card style={{ ...kpiCardStyle("1px solid #bfdbfe", "linear-gradient(135deg,#eef4ff,#fbfdff)"), padding: 22 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "#2563eb" }}>{announcements.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Messages publiés</div>
          </div>
        </Card>
        <Card style={{ ...kpiCardStyle("1px solid #99f6e4", "linear-gradient(135deg,#f0fdfa,#f8fffe)"), padding: 22 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "#0f766e" }}>{audience.employees.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Collab. ciblables</div>
          </div>
        </Card>
        <Card style={{ ...kpiCardStyle("1px solid #e9d5ff", "linear-gradient(135deg,#fdf4ff,#fcfaff)"), padding: 22 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "#7c3aed" }}>{initialJournal.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Entrées journal</div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 22, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <Card style={{ ...shellCardStyle(), padding: 22 }}>
          <Kicker moduleKey="admin" label="Accès bureau" />
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Créer ou modifier un accès</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Ici, tu gères les accès bureau séparément du RH. Tu peux donner un accès à n&apos;importe quelle fiche RH, ou créer un compte externe qui n&apos;appartient pas à l&apos;équipe.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Recherche RH</span>
                <input
                  value={officeEmployeeQuery}
                  onChange={(event) => setOfficeEmployeeQuery(event.target.value)}
                  placeholder="Ex: abdou, coordinateur..."
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Personne concernée</span>
                <select
                  value={officeForm.employeeId ?? ""}
                  onChange={(event) => startOfficeFormFromEmployee(event.target.value || null)}
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
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
            <div style={{ fontSize: 11, color: "#64748b", marginTop: -2 }}>
              {filteredOfficeFormEmployeeOptions.length} profil(s) RH trouvé(s)
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.05fr 1.05fr 0.9fr" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Nom bureau</span>
                <input
                  value={officeForm.fullName}
                  onChange={(event) => setOfficeForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Ex: Camille Durand"
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Email bureau</span>
                <input
                  value={officeForm.email}
                  onChange={(event) => setOfficeForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="prenom@ep.fr"
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
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
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                >
                  <option value="custom_access">Accès par modules</option>
                  <option value="viewer">Lecture seule</option>
                  <option value="manager">Accès complet manager</option>
                </select>
              </label>
            </div>

            {officeForm.employeeId ? (
              <div style={{ borderRadius: 12, border: "1px solid #dbeafe", background: "#f8fbff", color: "#334155", fontSize: 12, lineHeight: 1.5, padding: "10px 12px" }}>
                Cette personne vient des fichiers RH. Tu peux donc lui ajouter un accès bureau même si son statut RH est <strong>{getRhStatusLabel(officeEmployees.find((employee) => employee.id === officeForm.employeeId)?.rh_status ?? "")}</strong>.
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", fontSize: 12, lineHeight: 1.5, padding: "10px 12px" }}>
                Compte externe : utile pour une directrice, un autre manager ou une personne qui n&apos;existe pas dans les fichiers RH.
              </div>
            )}

            {officeForm.role !== "manager" ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Modules autorisés
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModuleMatrix((current) => !current)}
                    style={{
                      minHeight: 28,
                      borderRadius: 999,
                      border: "1px solid #dbe3eb",
                      background: "#fff",
                      color: "#475569",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "0 10px",
                      cursor: "pointer",
                    }}
                  >
                    {showModuleMatrix ? "Masquer détail" : "Afficher détail"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
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
              <div style={{ borderRadius: 12, border: "1px solid #dbeafe", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, lineHeight: 1.5, padding: "10px 12px" }}>
                Le rôle manager garde l'accès complet à tous les modules bureau.
              </div>
            )}

            {officeError ? (
              <div style={{ borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, padding: "10px 12px" }}>
                {officeError}
              </div>
            ) : null}
            {officeSuccess ? (
              <div style={{ borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", fontSize: 12, padding: "10px 12px" }}>
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
                  border: "1px solid #dbe3eb",
                  background: "#fff",
                  color: "#475569",
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
            <Kicker moduleKey="admin" label="Comptes bureau" />
            <h2 style={{ marginTop: 6, fontSize: 22, color: "#0f172a" }}>Accès existants</h2>
            <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              Liste des profils qui ont réellement un accès au dashboard bureau. Les profils RH sans modules n'apparaissent pas ici.
            </p>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              value={officeProfileQuery}
              onChange={(event) => setOfficeProfileQuery(event.target.value)}
              placeholder="Rechercher un accès (nom, email, rôle...)"
              style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
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
                <div key={profile.id} style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <strong style={{ fontSize: 14, color: "#0f172a" }}>{profile.full_name}</strong>
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#f8fafc", color: "#334155" }}>
                          {getOfficeRoleLabel(profile.role)}
                        </span>
                        {linkedEmployee ? (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#ecfeff", color: "#0f766e" }}>
                            Fiche RH liée · {linkedEmployee.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#fff7ed", color: "#c2410c" }}>
                            Personne externe à l'équipe
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{profile.email}</div>
                      <div style={{ marginTop: 7, fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                        {moduleSummary || "Aucun module configuré"}
                      </div>
                      {linkedEmployee ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
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
                          border: "1px solid #dbe3eb",
                          background: "#fff",
                          color: "#334155",
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
                          background: "#eef2ff",
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
              <div style={{ borderRadius: 14, border: "1px solid #dbe3eb", background: "#f8fafc", padding: 14, fontSize: 12, color: "#64748b" }}>
                {officeAccessProfiles.length ? "Aucun résultat pour cette recherche." : "Aucun accès bureau configuré pour le moment."}
              </div>
            )}
          </div>
          </Card>
        </div>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1.08fr 0.92fr 0.98fr", alignItems: "start" }}>
        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start" }}>
          <Kicker moduleKey="admin" label="Messages" />
          <h2 style={{ marginTop: 6, fontSize: 22, color: "#0f172a" }}>Publier un message info</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Crée un message terrain puis suis au même endroit ceux qui sont encore actifs.
          </p>
          <div
            style={{
              marginTop: 10,
              borderRadius: 12,
              border: "1px solid #dbeafe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: 12,
              lineHeight: 1.5,
              padding: "10px 12px",
            }}
          >
            Ce message restera visible dans le fil Infos, sans popup automatique à la connexion.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre du message"
              style={{ minHeight: 42, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 12px", fontSize: 13 }}
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Contenu du message..."
              rows={4}
              style={{ borderRadius: 12, border: "1px solid #dbe3eb", padding: "10px 12px", fontSize: 13, resize: "vertical" }}
            />
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Priorité</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as InfoAnnouncementPriority)}
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
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
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                >
                  <option value="all">Toute l&apos;équipe</option>
                  <option value="employees">Collaborateurs ciblés</option>
                  <option value="rayons">Rayons ciblés</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Diffuser à partir de</span>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(event) => setPublishAt(event.target.value)}
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Fin de diffusion</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 13, color: "#0f172a" }}
                />
              </label>
            </div>

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
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
                  Messages publiés
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>
                  Lecture compacte des annonces encore actives.
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{activeMessages.length} actif(s)</div>
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
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>{announcement.title}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: "#fff", color: meta.text }}>
                            {meta.label}
                          </span>
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
                            {getTargetingLabel(announcement)}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", padding: "3px 8px", borderRadius: 999, background: "#fff" }}>
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
              <div style={{ borderRadius: 14, border: "1px solid #dbe3eb", background: "#f8fafc", padding: 14, fontSize: 12, color: "#64748b" }}>
                Aucun message actif pour le moment.
              </div>
            )}
          </div>
        </Card>

        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start" }}>
          <Kicker moduleKey="admin" label="Maintenance" />
          <h2 style={{ marginTop: 6, fontSize: 22, color: "#0f172a" }}>Relances rapides</h2>
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
                <div key={action.id} style={{ borderRadius: 16, border: `1px solid ${tone.border}`, background: tone.bg, padding: "12px 14px" }}>
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
                        minHeight: 36,
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

        <Card style={{ ...shellCardStyle(), padding: 26, alignSelf: "start", minHeight: 620 }}>
          <Kicker moduleKey="admin" label="Journal" />
          <h2 style={{ marginTop: 6, fontSize: 22, color: "#0f172a" }}>Livraisons récentes</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Lecture rapide du changelog pour te souvenir de ce qui a été livré.
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 12,
              maxHeight: "min(56vh, 560px)",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
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
