import { createClient } from "@/lib/supabase";
import { balisageMonths, balisageObjective } from "@/lib/balisage-data";
import { normalizeRhEmployeeRole } from "@/lib/rh-status";
import { countDaysExcludingSundays } from "@/lib/absence-days";
import {
  METRE_A_METRE_SECTIONS,
  computeGlobalScore,
  computeSectionScore,
  createEmptyMetreAuditDraft,
  type MetreAuditDraft,
} from "@/lib/metre-a-metre-config";

type EmployeeRow = {
  id: string;
  name: string | null;
  tg_rayons?: string[] | null;
  actif?: boolean | null;
  type?: string | null;
  observation?: string | null;
};

export type FollowupEmployeeOption = {
  id: string;
  name: string;
  rayons: string[];
  role: string;
  eligibleForFieldVisit: boolean;
  eligibleForBalisage: boolean;
};

export type FollowupFieldVisitSetup = {
  employees: FollowupEmployeeOption[];
  rayons: string[];
};

type FollowupRow = {
  id: string;
  employee_id: string;
  audit_date: string;
  rayon: string;
  manager_name: string;
  collaborator_name: string;
  global_score: number;
  progress_axes: string;
  created_at: string;
};

type FollowupListRow = FollowupRow & {
  employee_followup_sections?: Array<Pick<FollowupSectionRow, "section_key" | "score">> | null;
};

type FollowupSectionRow = {
  id: string;
  followup_id: string;
  section_key: string;
  section_label: string;
  section_type: "rating" | "boolean";
  coefficient: number;
  score: number;
  comment: string;
  sort_order: number;
  employee_followup_items?: FollowupItemRow[] | null;
};

type FollowupItemRow = {
  id: string;
  section_id: string;
  item_key: string;
  item_label: string;
  item_type: "rating" | "boolean";
  expected_answer: "OUI" | "NON" | null;
  boolean_answer: "OUI" | "NON" | null;
  rating_value: number | null;
  score_value: number;
  sort_order: number;
};

type BalisageMonthlyRow = {
  mois: string;
  employee_id: string;
  total_controles: number | null;
  taux_erreur: number | null;
};

type AbsenceYearRow = {
  id: string;
  employee_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string | null;
  type: string | null;
};

const FOLLOWUP_EXCLUDED_NAMES = new Set(["DILAXSHAN"]);

export type MetreAuditListItem = {
  id: string;
  employeeId: string;
  auditDate: string;
  rayon: string;
  managerName: string;
  collaboratorName: string;
  globalScore: number;
  progressAxes: string;
  createdAt: string;
};

export type MetreAuditDetail = MetreAuditListItem & {
  sections: Array<{
    id: string;
    key: string;
    label: string;
    type: "rating" | "boolean";
    coefficient: number;
    score: number;
    comment: string;
    items: Array<{
      id: string;
      key: string;
      label: string;
      type: "rating" | "boolean";
      expectedAnswer: "OUI" | "NON" | null;
      booleanAnswer: "OUI" | "NON" | null;
      ratingValue: number | null;
      scoreValue: number;
    }>;
  }>;
};

export type EmployeeBalisageYearStats = {
  employeeId: string;
  year: number;
  totalControls: number;
  averagePerMonth: number;
  averageErrorRate: number | null;
  bestMonthLabel: string | null;
  bestMonthTotal: number;
  currentMonthLabel: string | null;
  currentMonthTotal: number;
  progressPercent: number;
  months: Array<{
    monthId: string;
    label: string;
    total: number;
    errorRate: number | null;
  }>;
};

export type EmployeeAbsenceYearStats = {
  employeeId: string;
  year: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  approvedDays: number;
  lastAbsenceStart: string | null;
  lastAbsenceType: string | null;
};

const sectionConfigByKey = new Map<string, (typeof METRE_A_METRE_SECTIONS)[number]>(
  METRE_A_METRE_SECTIONS.map((section) => [section.key, section]),
);

function computeStoredAuditGlobalScore(
  sections: Array<{ key: string; score: number }>,
  fallbackScore: number,
) {
  if (!sections.length) return fallbackScore;
  const totalCoefficient = METRE_A_METRE_SECTIONS.reduce((sum, section) => sum + section.coefficient, 0);
  if (!totalCoefficient) return fallbackScore;

  const weighted = sections.reduce((sum, section) => {
    const config = sectionConfigByKey.get(section.key);
    if (!config) return sum;
    return sum + section.score * config.coefficient;
  }, 0);

  return Number((weighted / totalCoefficient).toFixed(2));
}

function buildSectionRowsForAudit(followupId: string, draft: MetreAuditDraft) {
  return METRE_A_METRE_SECTIONS.map((section, sectionIndex) => ({
    followup_id: followupId,
    section_key: section.key,
    section_label: section.label,
    section_type: section.type,
    coefficient: section.coefficient,
    score: computeSectionScore(section, draft.sections[section.key]),
    comment: draft.sections[section.key].comment.trim(),
    sort_order: sectionIndex,
  }));
}

function buildItemRowsForAudit(
  sectionIdsByKey: Map<string, string>,
  draft: MetreAuditDraft,
) {
  return METRE_A_METRE_SECTIONS.flatMap((section) => {
    const sectionId = sectionIdsByKey.get(section.key);
    if (!sectionId) return [];
    const response = draft.sections[section.key];
    return section.questions.map((question, index) => {
      const ratingValue = question.type === "rating" ? response.ratings[question.key] : null;
      const booleanAnswer = question.type === "boolean" ? response.booleans[question.key] : null;
      const scoreValue =
        question.type === "rating"
          ? typeof ratingValue === "number"
            ? Number(((ratingValue / 5) * 100).toFixed(2))
            : 0
          : booleanAnswer && booleanAnswer === question.expectedAnswer
            ? 100
            : 0;

      return {
        section_id: sectionId,
        item_key: question.key,
        item_label: question.label,
        item_type: question.type,
        expected_answer: question.expectedAnswer ?? null,
        boolean_answer: booleanAnswer,
        rating_value: ratingValue,
        score_value: scoreValue,
        sort_order: index,
      };
    });
  });
}

async function replaceAuditSectionsAndItems(followupId: string, draft: MetreAuditDraft) {
  const supabase = createClient();
  const { data: existingSections, error: existingSectionsError } = await supabase
    .from("employee_followup_sections")
    .select("id")
    .eq("followup_id", followupId);

  if (existingSectionsError) throw existingSectionsError;

  const existingSectionIds = (existingSections ?? []).map((section) => String(section.id));

  if (existingSectionIds.length) {
    const { error: itemDeleteError } = await supabase
      .from("employee_followup_items")
      .delete()
      .in("section_id", existingSectionIds);

    if (itemDeleteError) throw itemDeleteError;

    const { error: sectionDeleteError } = await supabase
      .from("employee_followup_sections")
      .delete()
      .eq("followup_id", followupId);

    if (sectionDeleteError) throw sectionDeleteError;
  }

  const sectionRows = buildSectionRowsForAudit(followupId, draft);
  const { data: insertedSections, error: sectionError } = await supabase
    .from("employee_followup_sections")
    .insert(sectionRows)
    .select("id,section_key");

  if (sectionError) throw sectionError;

  const sectionIdsByKey = new Map(
    (insertedSections ?? []).map((section) => [String(section.section_key), String(section.id)]),
  );

  const itemRows = buildItemRowsForAudit(sectionIdsByKey, draft);
  const { error: itemError } = await supabase
    .from("employee_followup_items")
    .insert(itemRows);

  if (itemError) throw itemError;
}

function getTrackedBalisageMonthsForYear(today = new Date()) {
  const year = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  return balisageMonths.filter((month, index) => {
    const [, rawYear] = month.id.split("_");
    return Number(rawYear) === year && index <= currentMonthIndex;
  });
}

export async function loadFollowupEmployees(): Promise<FollowupEmployeeOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,tg_rayons,actif,type,observation")
    .eq("actif", true)
    .order("name");

  if (error) throw error;

  return ((data ?? []) as EmployeeRow[]).map((employee) => {
    const role = normalizeRhEmployeeRole(employee.observation, employee.type ?? undefined);
    const normalizedName = String(employee.name ?? "").trim().toUpperCase();
    const eligible =
      employee.actif === true &&
      role === "COLLABORATEUR" &&
      !FOLLOWUP_EXCLUDED_NAMES.has(normalizedName);

    return {
      id: String(employee.id),
      name: normalizedName,
      rayons: Array.isArray(employee.tg_rayons)
        ? employee.tg_rayons.map((rayon) => String(rayon).trim()).filter(Boolean)
        : [],
      role,
      eligibleForFieldVisit: eligible,
      eligibleForBalisage: eligible,
    };
  });
}

export async function loadFollowupFieldVisitSetup(): Promise<FollowupFieldVisitSetup> {
  const supabase = createClient();
  const employees = await loadFollowupEmployees();

  const employeeRayons = employees.flatMap((employee) => employee.rayons);
  const { data: tgRows } = await supabase
    .from("plans_tg_entries")
    .select("rayon")
    .limit(5000);

  const rayons = Array.from(
    new Set(
      [
        ...employeeRayons,
        ...((tgRows ?? [])
          .map((row) =>
            typeof row === "object" && row && "rayon" in row ? String((row as { rayon?: unknown }).rayon ?? "").trim() : "",
          )
          .filter(Boolean)),
      ].map((rayon) => rayon.trim().toUpperCase()).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "fr"));

  return { employees, rayons };
}

export async function loadManagerDisplayName(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "";

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return String(data?.full_name ?? user.email ?? "").trim();
}

export async function saveMetreAudit(draft: MetreAuditDraft) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const globalScore = computeGlobalScore(draft);
  const managerName = draft.managerName.trim() || String(user?.email ?? "").trim() || "Manager";
  const collaboratorName = draft.collaboratorName.trim() || "Collaborateur";
  const rayon = draft.rayon.trim();

  if (!rayon) {
    throw new Error("Le rayon est obligatoire pour enregistrer la visite.");
  }

  const { data: followup, error: followupError } = await supabase
    .from("employee_followups")
    .insert({
      employee_id: draft.employeeId,
      manager_user_id: user?.id ?? null,
      followup_type: "metre_a_metre",
      audit_date: draft.auditDate,
      rayon,
      manager_name: managerName,
      collaborator_name: collaboratorName,
      global_score: globalScore,
      progress_axes: draft.progressAxes.trim(),
    })
    .select("id")
    .single();

  if (followupError) throw followupError;

  const followupId = String(followup.id);

  try {
    await replaceAuditSectionsAndItems(followupId, draft);

    return { id: followupId, globalScore };
  } catch (error) {
    await supabase.from("employee_followups").delete().eq("id", followupId);
    throw error;
  }
}

export async function updateMetreAudit(auditId: string, draft: MetreAuditDraft) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const globalScore = computeGlobalScore(draft);
  const managerName = draft.managerName.trim() || String(user?.email ?? "").trim() || "Manager";
  const collaboratorName = draft.collaboratorName.trim() || "Collaborateur";
  const rayon = draft.rayon.trim();

  if (!rayon) {
    throw new Error("Le rayon est obligatoire pour modifier la visite.");
  }

  const { error: updateError } = await supabase
    .from("employee_followups")
    .update({
      employee_id: draft.employeeId,
      manager_user_id: user?.id ?? null,
      audit_date: draft.auditDate,
      rayon,
      manager_name: managerName,
      collaborator_name: collaboratorName,
      global_score: globalScore,
      progress_axes: draft.progressAxes.trim(),
    })
    .eq("id", auditId)
    .eq("followup_type", "metre_a_metre");

  if (updateError) throw updateError;

  await replaceAuditSectionsAndItems(auditId, draft);

  return { id: auditId, globalScore };
}

export async function loadRecentMetreAudits(limit = 20): Promise<MetreAuditListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employee_followups")
    .select(`
      id,
      employee_id,
      audit_date,
      rayon,
      manager_name,
      collaborator_name,
      global_score,
      progress_axes,
      created_at,
      employee_followup_sections (
        section_key,
        score
      )
    `)
    .eq("followup_type", "metre_a_metre")
    .order("audit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as FollowupListRow[]).map((row) => {
    const effectiveScore = computeStoredAuditGlobalScore(
      (row.employee_followup_sections ?? []).map((section) => ({
        key: String(section.section_key),
        score: Number(section.score ?? 0),
      })),
      Number(row.global_score ?? 0),
    );

    return {
      id: String(row.id),
      employeeId: String(row.employee_id),
      auditDate: String(row.audit_date),
      rayon: String(row.rayon ?? ""),
      managerName: String(row.manager_name ?? ""),
      collaboratorName: String(row.collaborator_name ?? ""),
      globalScore: effectiveScore,
      progressAxes: String(row.progress_axes ?? ""),
      createdAt: String(row.created_at ?? ""),
    };
  });
}

export async function deleteMetreAudit(auditId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("employee_followups")
    .delete()
    .eq("id", auditId)
    .eq("followup_type", "metre_a_metre");

  if (error) throw error;
}

export async function loadEmployeeBalisageYearStats(employeeIds: string[]): Promise<Record<string, EmployeeBalisageYearStats>> {
  const ids = employeeIds.map((id) => String(id)).filter(Boolean);
  if (!ids.length) return {};

  const supabase = createClient();
  const trackedMonths = getTrackedBalisageMonthsForYear();
  const monthIds = trackedMonths.map((month) => month.id);
  const currentYear = new Date().getFullYear();

  const baseStats = Object.fromEntries(
    ids.map((employeeId) => [
      employeeId,
      {
        employeeId,
        year: currentYear,
        totalControls: 0,
        averagePerMonth: 0,
        averageErrorRate: null,
        bestMonthLabel: null,
        bestMonthTotal: 0,
        currentMonthLabel: trackedMonths.at(-1)?.label ?? null,
        currentMonthTotal: 0,
        progressPercent: 0,
        months: trackedMonths.map((month) => ({
          monthId: month.id,
          label: month.label,
          total: 0,
          errorRate: null,
        })),
      } satisfies EmployeeBalisageYearStats,
    ]),
  ) as Record<string, EmployeeBalisageYearStats>;

  const { data, error } = await supabase
    .from("balisage_mensuel")
    .select("mois,employee_id,total_controles,taux_erreur")
    .in("employee_id", ids)
    .in("mois", monthIds);

  if (error) throw error;

  ((data ?? []) as BalisageMonthlyRow[]).forEach((row) => {
    const employeeId = String(row.employee_id);
    const employeeStats = baseStats[employeeId];
    if (!employeeStats) return;

    const monthIndex = employeeStats.months.findIndex((month) => month.monthId === String(row.mois));
    if (monthIndex < 0) return;

    employeeStats.months[monthIndex] = {
      ...employeeStats.months[monthIndex],
      total: Number(row.total_controles ?? 0),
      errorRate: row.taux_erreur == null ? null : Number(row.taux_erreur),
    };
  });

  Object.values(baseStats).forEach((stats) => {
    const totalControls = stats.months.reduce((sum, month) => sum + month.total, 0);
    const bestMonth = stats.months.reduce(
      (best, month) => (month.total > best.total ? month : best),
      stats.months[0] ?? { monthId: "", label: "", total: 0, errorRate: null },
    );
    const currentMonth = stats.months.at(-1) ?? null;
    const monthsWithErrorRate = stats.months.filter((month) => month.errorRate != null);

    stats.totalControls = totalControls;
    stats.averagePerMonth = stats.months.length ? Number((totalControls / stats.months.length).toFixed(1)) : 0;
    stats.averageErrorRate = monthsWithErrorRate.length
      ? Number((monthsWithErrorRate.reduce((sum, month) => sum + Number(month.errorRate ?? 0), 0) / monthsWithErrorRate.length).toFixed(2))
      : null;
    stats.bestMonthLabel = bestMonth.label || null;
    stats.bestMonthTotal = bestMonth.total;
    stats.currentMonthLabel = currentMonth?.label ?? null;
    stats.currentMonthTotal = currentMonth?.total ?? 0;
    stats.progressPercent = stats.months.length
      ? Math.min(Math.round((totalControls / (stats.months.length * balisageObjective)) * 100), 100)
      : 0;
  });

  return baseStats;
}

export async function loadEmployeeAbsenceYearStats(employeeIds: string[]): Promise<Record<string, EmployeeAbsenceYearStats>> {
  const ids = employeeIds.map((id) => String(id)).filter(Boolean);
  if (!ids.length) return {};

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const supabase = createClient();

  const baseStats = Object.fromEntries(
    ids.map((employeeId) => [
      employeeId,
      {
        employeeId,
        year: currentYear,
        totalRequests: 0,
        approvedRequests: 0,
        pendingRequests: 0,
        approvedDays: 0,
        lastAbsenceStart: null,
        lastAbsenceType: null,
      } satisfies EmployeeAbsenceYearStats,
    ]),
  ) as Record<string, EmployeeAbsenceYearStats>;

  const { data, error } = await supabase
    .from("absences")
    .select("id,employee_id,date_debut,date_fin,statut,type")
    .in("employee_id", ids)
    .lte("date_debut", yearEnd)
    .gte("date_fin", yearStart);

  if (error) throw error;

  ((data ?? []) as AbsenceYearRow[]).forEach((row) => {
    const employeeId = row.employee_id ? String(row.employee_id) : "";
    const stats = baseStats[employeeId];
    if (!stats) return;

    const startDate = String(row.date_debut ?? "");
    const endDate = String(row.date_fin ?? startDate);
    if (!startDate) return;

    stats.totalRequests += 1;
    if (String(row.statut ?? "") === "approuve") {
      stats.approvedRequests += 1;
      stats.approvedDays += countDaysExcludingSundays(startDate, endDate);
    }
    if (String(row.statut ?? "") === "en_attente") {
      stats.pendingRequests += 1;
    }

    if (!stats.lastAbsenceStart || startDate > stats.lastAbsenceStart) {
      stats.lastAbsenceStart = startDate;
      stats.lastAbsenceType = row.type ? String(row.type) : null;
    }
  });

  return baseStats;
}

export async function loadMetreAuditDetail(auditId: string): Promise<MetreAuditDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employee_followups")
    .select(`
      id,
      employee_id,
      audit_date,
      rayon,
      manager_name,
      collaborator_name,
      global_score,
      progress_axes,
      created_at,
      employee_followup_sections (
        id,
        followup_id,
        section_key,
        section_label,
        section_type,
        coefficient,
        score,
        comment,
        sort_order,
        employee_followup_items (
          id,
          section_id,
          item_key,
          item_label,
          item_type,
          expected_answer,
          boolean_answer,
          rating_value,
          score_value,
          sort_order
        )
      )
    `)
    .eq("id", auditId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as FollowupRow & { employee_followup_sections?: FollowupSectionRow[] | null };

  const normalizedSections = (row.employee_followup_sections ?? [])
    .slice()
    .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
    .map((section) => {
      const config = sectionConfigByKey.get(String(section.section_key));
      return {
        id: String(section.id),
        key: String(section.section_key),
        label: String(section.section_label),
        type: section.section_type,
        coefficient: Number(config?.coefficient ?? section.coefficient ?? 0),
        score: Number(section.score ?? 0),
        comment: String(section.comment ?? ""),
        items: (section.employee_followup_items ?? [])
          .slice()
          .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
          .map((item) => ({
            id: String(item.id),
            key: String(item.item_key),
            label: String(item.item_label),
            type: item.item_type,
            expectedAnswer: item.expected_answer ?? null,
            booleanAnswer: item.boolean_answer ?? null,
            ratingValue: item.rating_value == null ? null : Number(item.rating_value),
            scoreValue: Number(item.score_value ?? 0),
          })),
      };
    });

  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    auditDate: String(row.audit_date),
    rayon: String(row.rayon ?? ""),
    managerName: String(row.manager_name ?? ""),
    collaboratorName: String(row.collaborator_name ?? ""),
    globalScore: computeStoredAuditGlobalScore(
      normalizedSections.map((section) => ({ key: section.key, score: section.score })),
      Number(row.global_score ?? 0),
    ),
    progressAxes: String(row.progress_axes ?? ""),
    createdAt: String(row.created_at ?? ""),
    sections: normalizedSections,
  };
}

export async function loadMetreAuditDraft(auditId: string): Promise<MetreAuditDraft | null> {
  const detail = await loadMetreAuditDetail(auditId);
  if (!detail) return null;

  const draft = createEmptyMetreAuditDraft();
  draft.auditDate = detail.auditDate;
  draft.rayon = detail.rayon;
  draft.managerName = detail.managerName;
  draft.collaboratorName = detail.collaboratorName;
  draft.employeeId = detail.employeeId;
  draft.progressAxes = detail.progressAxes;

  detail.sections.forEach((section) => {
    const draftSection = draft.sections[section.key];
    if (!draftSection) return;

    draftSection.comment = section.comment;
    section.items.forEach((item) => {
      if (item.type === "rating") {
        draftSection.ratings[item.key] = item.ratingValue;
      } else {
        draftSection.booleans[item.key] = item.booleanAnswer;
      }
    });
  });

  return draft;
}
