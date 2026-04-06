import { createClient } from "@/lib/supabase";

export type RupturePeriod = "matin" | "fin_matinee";
export type RuptureHistoryRange = "week" | "month" | "quarter" | "year";

export type RuptureEmployee = {
  id: string;
  name: string;
  actif: boolean;
  rupturesRayons: number[];
  matriculeMetier: string | null;
};

export type RuptureDetailRow = {
  id: string;
  importId: string;
  cug: string | null;
  ean: string | null;
  libelleProduit: string;
  marche: number | null;
  matriculeSource: string | null;
  fournisseur: string | null;
  cause: string | null;
  statut: string;
  isBio: boolean;
  employeeId: string | null;
};

export type ParsedRuptureRow = {
  rayonNum: number;
  rayonLabel: string;
  employeeId: string | null;
  totalATraiter: number;
  ouvertesAujourdHui: number;
  attenteControleStock: number;
  attenteMiseEnRayon: number;
  attenteCorrectionParametrage: number;
  attenteSuppressionBalisage: number;
  attenteDemandePreparation: number;
  sousResponsabiliteCollab: number;
  pctTraitement: number | null;
  nbTraite: number | null;
  collabMatin: number | null;
  collabFin: number | null;
};

export type RuptureImportRow = {
  id: string;
  importedAt: string;
  period: RupturePeriod;
  fileName: string | null;
  nbRayons: number;
  totalRuptures: number;
  semaine: string | null;
  dateKey: string;
  importKind: "single_file" | "legacy";
};

export type RuptureTeamSnapshot = {
  importRow: RuptureImportRow | null;
  rows: ParsedRuptureRow[];
  totalRuptures: number;
  collab: number;
  logistique: number;
  pctTraitement: number | null;
  rayonsCount: number;
};

export type RuptureCollaboratorRow = {
  employeeId: string;
  employeeName: string;
  totalLatest: number;
  morningCollab: number;
  finCollab: number | null;
  treated: number | null;
  pct: number | null;
  hasMorningWork: boolean;
  hasActiveWork: boolean;
};

export type RuptureHistoryRow = {
  employeeId: string;
  employeeName: string;
  dayCount: number;
  averagePct: number | null;
};

export type RuptureRayonRow = ParsedRuptureRow & {
  employeeName: string | null;
};

export type RupturesDashboardData = {
  employees: RuptureEmployee[];
  recentImports: RuptureImportRow[];
  availableDates: string[];
  selectedDate: string;
  morning: RuptureTeamSnapshot;
  fin: RuptureTeamSnapshot;
  latest: RuptureTeamSnapshot;
  collaboratorRows: RuptureCollaboratorRow[];
  historyRows: RuptureHistoryRow[];
  rayonRows: RuptureRayonRow[];
  detailRows: RuptureDetailRow[];
  detailEnabled: boolean;
};

type RupturesSchemaCapabilities = {
  importPeriode: boolean;
  modernSynthese: boolean;
  detailTable: boolean;
  employeeMatricule: boolean;
};

type DbLegacyImportRow = {
  id: string;
  imported_at: string;
  imported_by: string | null;
  fichier_synthese_nom: string | null;
  fichier_detail_nom?: string | null;
  nb_rayons: number | null;
  nb_produits?: number | null;
  total_ruptures: number | null;
  semaine: string | null;
  commentaire: string | null;
  periode?: string | null;
};

type DbLegacySyntheseRow = {
  id: string;
  import_id: string;
  rayon: string | null;
  total_a_traiter: number | null;
  ouvertes_aujourd_hui: number | null;
  attente_commande: number | null;
  attente_controle_stock: number | null;
  attente_mise_en_rayon: number | null;
  attente_correction_parametrage: number | null;
  attente_suppression_balisage: number | null;
  pct_traitement: number | null;
  nb_traite: number | null;
  collab_matin: number | null;
  collab_fin: number | null;
};

type DbModernSyntheseRow = {
  id: string;
  import_id: string;
  rayon_num: number | null;
  rayon_label: string | null;
  employee_id: string | null;
  total_a_traiter: number | null;
  ouvertes_aujourd_hui: number | null;
  sous_responsabilite_collab: number | null;
  attente_controle_stock: number | null;
  attente_mise_en_rayon: number | null;
  attente_correction_parametrage: number | null;
  attente_suppression_balisage: number | null;
  attente_demande_preparation: number | null;
  pct_traitement: number | null;
  nb_traite: number | null;
  collab_matin: number | null;
  collab_fin: number | null;
};

type SaveParsedRupturesImportInput = {
  period: RupturePeriod;
  sourceImportedAt: string;
  fileName: string | null;
  detailFileName?: string | null;
  detailRowCount?: number | null;
  rows: ParsedRuptureRow[];
  detailRows?: Omit<RuptureDetailRow, "id" | "importId">[];
};

const EMPTY_TEAM_SNAPSHOT: RuptureTeamSnapshot = {
  importRow: null,
  rows: [],
  totalRuptures: 0,
  collab: 0,
  logistique: 0,
  pctTraitement: null,
  rayonsCount: 0,
};

export const RUPTURES_COLOR = "#D40511";
export const RUPTURE_COLLAB_STATUSES = new Set([
  "Attente de demande de préparation",
  "Attente Contrôle de Stock",
  "Attente Mise en Rayon",
  "Attente Correction Paramétrage",
  "Attente Suppression Balisage",
]);

let schemaCapabilitiesPromise: Promise<RupturesSchemaCapabilities> | null = null;

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function toInteger(value: unknown) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? Math.round(normalized) : 0;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatRuptureDateLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRuptureDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) + " · " + date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRupturePeriodLabel(period: RupturePeriod) {
  return period === "fin_matinee" ? "Fin de matinée" : "Début de matinée";
}

export function getRupturePctTone(pct: number | null) {
  if (pct === null) return "#639922";
  if (pct === 100) return "#639922";
  if (pct >= 80) return "#EF9F27";
  return "#E24B4A";
}

function getIsoWeekLabel(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseLegacyPeriod(commentaire: string | null | undefined): RupturePeriod {
  const normalized = String(commentaire ?? "").toLowerCase();
  if (normalized.includes("periode:fin_matinee")) return "fin_matinee";
  if (normalized.includes("service:aprem") || normalized.includes("service:soir")) return "fin_matinee";
  return "matin";
}

function buildImportCommentaire(period: RupturePeriod) {
  return `periode:${period}`;
}

function encodeLegacyRayon(rayonNum: number, rayonLabel: string) {
  return `${rayonNum}|${rayonLabel}`;
}

function decodeLegacyRayon(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return {
      rayonNum: 0,
      rayonLabel: "",
    };
  }

  const [numPart, ...labelParts] = raw.split("|");
  const rayonNum = Number(numPart);
  if (Number.isFinite(rayonNum) && labelParts.length) {
    return {
      rayonNum,
      rayonLabel: labelParts.join("|").trim(),
    };
  }

  const prefixedMatch = raw.match(/^(\d+)\s*[·|-]\s*(.+)$/);
  if (prefixedMatch) {
    return {
      rayonNum: Number(prefixedMatch[1]),
      rayonLabel: prefixedMatch[2].trim(),
    };
  }

  return {
    rayonNum: 0,
    rayonLabel: raw,
  };
}

function getDateKeyFromIso(value: string) {
  return formatLocalIsoDate(new Date(value));
}

function buildTeamSnapshot(importRow: RuptureImportRow | null, rows: ParsedRuptureRow[]): RuptureTeamSnapshot {
  if (!importRow) return EMPTY_TEAM_SNAPSHOT;
  const totalRuptures = rows.reduce((sum, row) => sum + row.totalATraiter, 0);
  const collab = rows.reduce((sum, row) => sum + row.sousResponsabiliteCollab, 0);
  const logistique = Math.max(totalRuptures - collab, 0);
  const pctTraitement = totalRuptures > 0 ? Math.round(((totalRuptures - collab) / totalRuptures) * 100) : null;

  return {
    importRow,
    rows,
    totalRuptures,
    collab,
    logistique,
    pctTraitement,
    rayonsCount: rows.length,
  };
}

function buildRayonOwnerIndex(employees: RuptureEmployee[]) {
  const byRayon = new Map<number, string | null>();
  const namesById = new Map<string, string>();

  employees.forEach((employee) => {
    namesById.set(employee.id, employee.name);
  });

  employees.forEach((employee) => {
    employee.rupturesRayons.forEach((rayonNum) => {
      if (!Number.isFinite(rayonNum)) return;
      if (!byRayon.has(rayonNum)) {
        byRayon.set(rayonNum, employee.id);
        return;
      }
      const existing = byRayon.get(rayonNum);
      if (existing !== employee.id) {
        byRayon.set(rayonNum, null);
      }
    });
  });

  return {
    byRayon,
    namesById,
  };
}

function resolveRowEmployeeId(row: ParsedRuptureRow, rayonOwners: Map<number, string | null>) {
  if (row.employeeId) return row.employeeId;
  return rayonOwners.get(row.rayonNum) ?? null;
}

function aggregateCollaboratorRows(
  employees: RuptureEmployee[],
  morningRows: ParsedRuptureRow[],
  finRows: ParsedRuptureRow[],
  latestRows: ParsedRuptureRow[],
  morningDetailRows: RuptureDetailRow[] = [],
  finDetailRows: RuptureDetailRow[] = [],
  latestDetailRows: RuptureDetailRow[] = [],
) {
  const { byRayon } = buildRayonOwnerIndex(employees);
  const hasDetail = morningDetailRows.length > 0 || finDetailRows.length > 0 || latestDetailRows.length > 0;

  return employees
    .filter((employee) => employee.actif && employee.rupturesRayons.length > 0)
    .map((employee) => {
      const ownedMorning = morningRows.filter((row) => resolveRowEmployeeId(row, byRayon) === employee.id);
      const ownedFin = finRows.filter((row) => resolveRowEmployeeId(row, byRayon) === employee.id);
      const ownedLatest = latestRows.filter((row) => resolveRowEmployeeId(row, byRayon) === employee.id);
      const ownedMorningDetail = morningDetailRows.filter((row) => row.employeeId === employee.id);
      const ownedFinDetail = finDetailRows.filter((row) => row.employeeId === employee.id);
      const ownedLatestDetail = latestDetailRows.filter((row) => row.employeeId === employee.id);

      const morningCollab = hasDetail
        ? ownedMorningDetail.length
        : ownedMorning.reduce((sum, row) => sum + row.sousResponsabiliteCollab, 0);
      const finCollab = finRows.length || finDetailRows.length
        ? hasDetail
          ? ownedFinDetail.length
          : ownedFin.reduce((sum, row) => sum + row.sousResponsabiliteCollab, 0)
        : null;
      const treated = finCollab === null ? null : Math.max(morningCollab - finCollab, 0);
      const pct = finCollab === null
        ? null
        : morningCollab > 0
          ? Math.round((Math.max(morningCollab - finCollab, 0) / morningCollab) * 100)
          : null;

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          totalLatest: hasDetail
            ? ownedLatestDetail.length
            : ownedLatest.reduce((sum, row) => sum + row.totalATraiter, 0),
          morningCollab,
          finCollab,
          treated,
          pct,
          hasMorningWork: morningCollab > 0,
          hasActiveWork: (finCollab ?? morningCollab) > 0 || (hasDetail ? ownedLatestDetail.length > 0 : ownedLatest.length > 0),
        } satisfies RuptureCollaboratorRow;
      })
      .sort((left, right) => {
        if (left.hasActiveWork !== right.hasActiveWork) {
          return left.hasActiveWork ? -1 : 1;
        }
        if (left.hasMorningWork !== right.hasMorningWork) {
          return left.hasMorningWork ? -1 : 1;
        }

      const leftScore = left.pct ?? -1;
      const rightScore = right.pct ?? -1;
      if (rightScore !== leftScore) return rightScore - leftScore;
      if (right.morningCollab !== left.morningCollab) return right.morningCollab - left.morningCollab;
      return left.employeeName.localeCompare(right.employeeName, "fr");
    });
}

function isDateWithinRange(dateKey: string, anchorDateKey: string, range: RuptureHistoryRange) {
  const date = new Date(`${dateKey}T12:00:00`);
  const anchor = new Date(`${anchorDateKey}T12:00:00`);

  if (range === "week") {
    const diff = Math.floor((anchor.getTime() - date.getTime()) / 86400000);
    return diff >= 0 && diff < 7;
  }

  if (range === "month") {
    return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
  }

  if (range === "quarter") {
    const anchorQuarter = Math.floor(anchor.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return date.getFullYear() === anchor.getFullYear() && dateQuarter === anchorQuarter;
  }

  return date.getFullYear() === anchor.getFullYear();
}

function buildHistoryRows(
  employees: RuptureEmployee[],
  imports: RuptureImportRow[],
  rowsByImportId: Map<string, ParsedRuptureRow[]>,
  selectedDate: string,
  range: RuptureHistoryRange,
) {
  const importsByDate = new Map<string, { matin?: RuptureImportRow; fin_matinee?: RuptureImportRow }>();

  imports.forEach((item) => {
    if (!isDateWithinRange(item.dateKey, selectedDate, range)) return;
    const current = importsByDate.get(item.dateKey) ?? {};
    current[item.period] = item;
    importsByDate.set(item.dateKey, current);
  });

  const dailyStatsByEmployee = new Map<string, number[]>();

  importsByDate.forEach((bundle) => {
    if (!bundle.matin || !bundle.fin_matinee) return;
    const morningRows = rowsByImportId.get(bundle.matin.id) ?? [];
    const finRows = rowsByImportId.get(bundle.fin_matinee.id) ?? [];
    const collaboratorRows = aggregateCollaboratorRows(employees, morningRows, finRows, finRows);

    collaboratorRows.forEach((row) => {
      if (row.morningCollab <= 0 || row.pct === null) return;
      const current = dailyStatsByEmployee.get(row.employeeId) ?? [];
      current.push(row.pct);
      dailyStatsByEmployee.set(row.employeeId, current);
    });
  });

  return employees
    .filter((employee) => employee.actif && employee.rupturesRayons.length > 0)
    .map((employee) => {
      const stats = dailyStatsByEmployee.get(employee.id) ?? [];
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        dayCount: stats.length,
        averagePct: stats.length
          ? Math.round(stats.reduce((sum, value) => sum + value, 0) / stats.length)
          : null,
      } satisfies RuptureHistoryRow;
    })
    .sort((left, right) => {
      const leftScore = left.averagePct ?? -1;
      const rightScore = right.averagePct ?? -1;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.employeeName.localeCompare(right.employeeName, "fr");
    });
}

function mapLegacyImportToUi(row: DbLegacyImportRow): RuptureImportRow {
  const importedAt = String(row.imported_at);
  const commentaire = String(row.commentaire ?? "").toLowerCase();
  return {
    id: row.id,
    importedAt,
    period: row.periode === "fin_matinee" || row.periode === "matin"
      ? row.periode
      : parseLegacyPeriod(row.commentaire),
    fileName: row.fichier_synthese_nom,
    nbRayons: toInteger(row.nb_rayons),
    totalRuptures: toInteger(row.total_ruptures),
    semaine: normalizeString(row.semaine),
    dateKey: getDateKeyFromIso(importedAt),
    importKind: commentaire.includes("periode:") ? "single_file" : "legacy",
  };
}

function mapLegacySyntheseRow(row: DbLegacySyntheseRow): ParsedRuptureRow {
  const rayon = decodeLegacyRayon(row.rayon);
  const attenteDemandePreparation = toInteger(row.attente_commande);
  const attenteControleStock = toInteger(row.attente_controle_stock);
  const attenteMiseEnRayon = toInteger(row.attente_mise_en_rayon);
  const attenteCorrectionParametrage = toInteger(row.attente_correction_parametrage);
  const attenteSuppressionBalisage = toInteger(row.attente_suppression_balisage);

  return {
    rayonNum: rayon.rayonNum,
    rayonLabel: rayon.rayonLabel,
    employeeId: null,
    totalATraiter: toInteger(row.total_a_traiter),
    ouvertesAujourdHui: toInteger(row.ouvertes_aujourd_hui),
    attenteControleStock,
    attenteMiseEnRayon,
    attenteCorrectionParametrage,
    attenteSuppressionBalisage,
    attenteDemandePreparation,
    sousResponsabiliteCollab:
      attenteControleStock +
      attenteMiseEnRayon +
      attenteCorrectionParametrage +
      attenteSuppressionBalisage +
      attenteDemandePreparation,
    pctTraitement: row.pct_traitement === null ? null : toInteger(row.pct_traitement),
    nbTraite: row.nb_traite === null ? null : toInteger(row.nb_traite),
    collabMatin: row.collab_matin === null ? null : toInteger(row.collab_matin),
    collabFin: row.collab_fin === null ? null : toInteger(row.collab_fin),
  };
}

function mapModernSyntheseRow(row: DbModernSyntheseRow): ParsedRuptureRow {
  return {
    rayonNum: toInteger(row.rayon_num),
    rayonLabel: String(row.rayon_label ?? "").trim(),
    employeeId: normalizeString(row.employee_id),
    totalATraiter: toInteger(row.total_a_traiter),
    ouvertesAujourdHui: toInteger(row.ouvertes_aujourd_hui),
    attenteControleStock: toInteger(row.attente_controle_stock),
    attenteMiseEnRayon: toInteger(row.attente_mise_en_rayon),
    attenteCorrectionParametrage: toInteger(row.attente_correction_parametrage),
    attenteSuppressionBalisage: toInteger(row.attente_suppression_balisage),
    attenteDemandePreparation: toInteger(row.attente_demande_preparation),
    sousResponsabiliteCollab: toInteger(row.sous_responsabilite_collab),
    pctTraitement: row.pct_traitement === null ? null : toInteger(row.pct_traitement),
    nbTraite: row.nb_traite === null ? null : toInteger(row.nb_traite),
    collabMatin: row.collab_matin === null ? null : toInteger(row.collab_matin),
    collabFin: row.collab_fin === null ? null : toInteger(row.collab_fin),
  };
}

async function getSchemaCapabilities() {
  if (schemaCapabilitiesPromise) return schemaCapabilitiesPromise;

  schemaCapabilitiesPromise = (async () => {
    const supabase = createClient();
    const [
      { error: importPeriodeError },
      { error: modernSyntheseError },
      { error: detailTableError },
      { error: employeeMatriculeError },
    ] = await Promise.all([
      supabase.from("ruptures_imports").select("periode").limit(1),
      supabase
        .from("ruptures_synthese")
        .select("rayon_num,rayon_label,employee_id,sous_responsabilite_collab,attente_demande_preparation")
        .limit(1),
      supabase
        .from("ruptures_detail")
        .select("id,import_id,cug,ean,libelle_produit,marche,matricule_source,fournisseur,cause,statut,is_bio,employee_id")
        .limit(1),
      supabase
        .from("employees")
        .select("matricule_metier")
        .limit(1),
    ]);

    return {
      importPeriode: !importPeriodeError,
      modernSynthese: !modernSyntheseError,
      detailTable: !detailTableError,
      employeeMatricule: !employeeMatriculeError,
    } satisfies RupturesSchemaCapabilities;
  })();

  return schemaCapabilitiesPromise;
}

async function loadSyntheseRowsByImportIds(importIds: string[]) {
  if (!importIds.length) return new Map<string, ParsedRuptureRow[]>();
  const supabase = createClient();
  const capabilities = await getSchemaCapabilities();

  if (capabilities.modernSynthese) {
    const { data, error } = await supabase
      .from("ruptures_synthese")
      .select("id,import_id,rayon_num,rayon_label,employee_id,total_a_traiter,ouvertes_aujourd_hui,sous_responsabilite_collab,attente_controle_stock,attente_mise_en_rayon,attente_correction_parametrage,attente_suppression_balisage,attente_demande_preparation,pct_traitement,nb_traite,collab_matin,collab_fin")
      .in("import_id", importIds);

    if (error) throw error;

    const map = new Map<string, ParsedRuptureRow[]>();
    ((data ?? []) as unknown as DbModernSyntheseRow[]).forEach((row) => {
      const current = map.get(row.import_id) ?? [];
      current.push(mapModernSyntheseRow(row));
      map.set(row.import_id, current);
    });
    return map;
  }

  const { data, error } = await supabase
    .from("ruptures_synthese")
    .select("id,import_id,rayon,total_a_traiter,ouvertes_aujourd_hui,attente_commande,attente_controle_stock,attente_mise_en_rayon,attente_correction_parametrage,attente_suppression_balisage,pct_traitement,nb_traite,collab_matin,collab_fin")
    .in("import_id", importIds);

  if (error) throw error;

  const map = new Map<string, ParsedRuptureRow[]>();
  ((data ?? []) as unknown as DbLegacySyntheseRow[]).forEach((row) => {
    const current = map.get(row.import_id) ?? [];
    current.push(mapLegacySyntheseRow(row));
    map.set(row.import_id, current);
  });
  return map;
}

export async function loadRupturesEmployees() {
  const supabase = createClient();
  const capabilities = await getSchemaCapabilities();
  const select = capabilities.employeeMatricule
    ? "id,name,actif,ruptures_rayons,matricule_metier"
    : "id,name,actif,ruptures_rayons";
  const { data, error } = await supabase
    .from("employees")
    .select(select)
    .order("name")
    .limit(5000);

  if (error) throw error;

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((employee) => ({
    id: String(employee.id),
    name: String(employee.name ?? "").trim().toUpperCase(),
    actif: Boolean(employee.actif),
    rupturesRayons: Array.isArray(employee.ruptures_rayons)
      ? employee.ruptures_rayons
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item))
      : [],
    matriculeMetier: normalizeString(employee.matricule_metier)?.toUpperCase() ?? null,
  })) satisfies RuptureEmployee[];
}

async function loadDetailRowsByImportIds(importIds: string[]) {
  if (!importIds.length) {
    return {
      detailEnabled: false,
      rowsByImportId: new Map<string, RuptureDetailRow[]>(),
    };
  }

  const capabilities = await getSchemaCapabilities();
  if (!capabilities.detailTable) {
    return {
      detailEnabled: false,
      rowsByImportId: new Map<string, RuptureDetailRow[]>(),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ruptures_detail")
    .select("id,import_id,cug,ean,libelle_produit,marche,matricule_source,fournisseur,cause,statut,is_bio,employee_id")
    .in("import_id", importIds)
    .order("libelle_produit");

  if (error) throw error;

  const rowsByImportId = new Map<string, RuptureDetailRow[]>();
  ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id ?? ""),
      importId: String(row.import_id ?? ""),
      cug: normalizeString(row.cug),
      ean: normalizeString(row.ean),
      libelleProduit: String(row.libelle_produit ?? "").trim(),
      marche: row.marche === null || row.marche === undefined ? null : toInteger(row.marche),
      matriculeSource: normalizeString(row.matricule_source)?.toUpperCase() ?? null,
      fournisseur: normalizeString(row.fournisseur),
      cause: normalizeString(row.cause),
      statut: String(row.statut ?? "").trim(),
      isBio: Boolean(row.is_bio),
      employeeId: normalizeString(row.employee_id),
    }))
    .filter((row) => RUPTURE_COLLAB_STATUSES.has(row.statut))
    .forEach((row) => {
      const current = rowsByImportId.get(row.importId) ?? [];
      current.push(row);
      rowsByImportId.set(row.importId, current);
    });

  return {
    detailEnabled: true,
    rowsByImportId,
  };
}

export async function loadRupturesImports(limit = 60) {
  const supabase = createClient();
  const capabilities = await getSchemaCapabilities();
  const select = capabilities.importPeriode
    ? "id,imported_at,imported_by,fichier_synthese_nom,fichier_detail_nom,nb_rayons,nb_produits,total_ruptures,semaine,commentaire,periode"
    : "id,imported_at,imported_by,fichier_synthese_nom,fichier_detail_nom,nb_rayons,nb_produits,total_ruptures,semaine,commentaire";

  const { data, error } = await supabase
    .from("ruptures_imports")
    .select(select)
    .order("imported_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as unknown as DbLegacyImportRow[])
    .map(mapLegacyImportToUi)
    .sort((left, right) => {
      const timeDiff = new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      if (left.importKind !== right.importKind) {
        return left.importKind === "single_file" ? -1 : 1;
      }
      return right.id.localeCompare(left.id);
    });
}

export async function saveParsedRupturesImport(input: SaveParsedRupturesImportInput) {
  const supabase = createClient();
  const capabilities = await getSchemaCapabilities();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dateKey = getDateKeyFromIso(input.sourceImportedAt);
  const existingImports = await loadRupturesImports(80);
  const existingImport = existingImports.find((item) => item.dateKey === dateKey && item.period === input.period);

  const totalRuptures = input.rows.reduce((sum, row) => sum + row.totalATraiter, 0);
  let morningRows: ParsedRuptureRow[] = [];

  if (input.period === "fin_matinee") {
    const morningImport = existingImports.find((item) => item.dateKey === dateKey && item.period === "matin");
    if (morningImport?.id) {
      const rowsByImportId = await loadSyntheseRowsByImportIds([morningImport.id]);
      morningRows = rowsByImportId.get(morningImport.id) ?? [];
    }
  }

  const morningMap = new Map<number, ParsedRuptureRow>();
  morningRows.forEach((row) => {
    morningMap.set(row.rayonNum, row);
  });

  const rowsWithStats = input.rows.map((row) => {
    if (input.period !== "fin_matinee") {
      return {
        ...row,
        pctTraitement: null,
        nbTraite: null,
        collabMatin: null,
        collabFin: null,
      };
    }

    const morningMatch = morningMap.get(row.rayonNum);
    const collabMatin = morningMatch?.sousResponsabiliteCollab ?? row.sousResponsabiliteCollab;
    const collabFin = row.sousResponsabiliteCollab;
    const nbTraite = Math.max(collabMatin - collabFin, 0);
    const pctTraitement = collabMatin > 0 ? Math.round((nbTraite / collabMatin) * 100) : null;

    return {
      ...row,
      pctTraitement,
      nbTraite,
      collabMatin,
      collabFin,
    };
  });

  const baseImportPayload = {
    imported_at: new Date(input.sourceImportedAt).toISOString(),
    imported_by: user?.id ?? null,
    fichier_synthese_nom: input.fileName,
    fichier_detail_nom: input.detailFileName ?? null,
    nb_rayons: input.rows.length,
    nb_produits: input.detailRowCount ?? null,
    total_ruptures: totalRuptures,
    semaine: getIsoWeekLabel(dateKey),
    commentaire: buildImportCommentaire(input.period),
  };

  const importPayload = capabilities.importPeriode
    ? { ...baseImportPayload, periode: input.period }
    : baseImportPayload;

  let importId = existingImport?.id ?? null;

  if (!importId) {
    const { data, error } = await supabase
      .from("ruptures_imports")
      .insert(importPayload)
      .select("id")
      .single();

    if (error) throw error;
    importId = String(data.id);
  } else {
    const { error } = await supabase
      .from("ruptures_imports")
      .update(importPayload)
      .eq("id", importId);

    if (error) throw error;
  }

  const { error: deleteError } = await supabase.from("ruptures_synthese").delete().eq("import_id", importId);
  if (deleteError) throw deleteError;

  if (!rowsWithStats.length) return importId;

  const synthesePayload = capabilities.modernSynthese
    ? rowsWithStats.map((row) => ({
        import_id: importId,
        rayon_num: row.rayonNum,
        rayon_label: row.rayonLabel,
        employee_id: row.employeeId,
        total_a_traiter: row.totalATraiter,
        ouvertes_aujourd_hui: row.ouvertesAujourdHui,
        sous_responsabilite_collab: row.sousResponsabiliteCollab,
        attente_controle_stock: row.attenteControleStock,
        attente_mise_en_rayon: row.attenteMiseEnRayon,
        attente_correction_parametrage: row.attenteCorrectionParametrage,
        attente_suppression_balisage: row.attenteSuppressionBalisage,
        attente_demande_preparation: row.attenteDemandePreparation,
        pct_traitement: row.pctTraitement,
        nb_traite: row.nbTraite,
        collab_matin: row.collabMatin,
        collab_fin: row.collabFin,
      }))
    : rowsWithStats.map((row) => ({
        import_id: importId,
        rayon: encodeLegacyRayon(row.rayonNum, row.rayonLabel),
        total_a_traiter: row.totalATraiter,
        ouvertes_aujourd_hui: row.ouvertesAujourdHui,
        attente_commande: row.attenteDemandePreparation,
        attente_controle_stock: row.attenteControleStock,
        attente_mise_en_rayon: row.attenteMiseEnRayon,
        attente_correction_parametrage: row.attenteCorrectionParametrage,
        attente_suppression_balisage: row.attenteSuppressionBalisage,
        pct_traitement: row.pctTraitement,
        nb_traite: row.nbTraite,
        collab_matin: row.collabMatin,
        collab_fin: row.collabFin,
      }));

  const { error: insertError } = await supabase.from("ruptures_synthese").insert(synthesePayload);
  if (insertError) throw insertError;

  if (capabilities.detailTable) {
    const { error: deleteDetailError } = await supabase.from("ruptures_detail").delete().eq("import_id", importId);
    if (deleteDetailError) throw deleteDetailError;

    if (input.detailRows?.length) {
      const detailPayload = input.detailRows.map((row) => ({
        import_id: importId,
        cug: row.cug,
        ean: row.ean,
        libelle_produit: row.libelleProduit,
        marche: row.marche,
        matricule_source: row.matriculeSource,
        fournisseur: row.fournisseur,
        cause: row.cause,
        statut: row.statut,
        is_bio: row.isBio,
        employee_id: row.employeeId,
      }));
      const { error: insertDetailError } = await supabase.from("ruptures_detail").insert(detailPayload);
      if (insertDetailError) throw insertDetailError;
    }
  }

  return importId;
}

export async function reassignRuptureDetail(ruptureId: string, employeeId: string | null) {
  const capabilities = await getSchemaCapabilities();
  if (!capabilities.detailTable) {
    throw new Error("La table ruptures_detail n'est pas encore disponible dans Supabase.");
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("ruptures_detail")
    .update({ employee_id: employeeId })
    .eq("id", ruptureId);

  if (error) throw error;
}

export async function loadRupturesDashboard(selectedDate?: string, historyRange: RuptureHistoryRange = "week") {
  const [employees, recentImports] = await Promise.all([
    loadRupturesEmployees(),
    loadRupturesImports(120),
  ]);

  const availableDates = Array.from(new Set(recentImports.map((item) => item.dateKey))).sort((left, right) => right.localeCompare(left));
  const fallbackDate = availableDates[0] ?? formatLocalIsoDate(new Date());
  const effectiveDate = selectedDate && availableDates.includes(selectedDate) ? selectedDate : fallbackDate;

  const morningImport = recentImports.find((item) => item.dateKey === effectiveDate && item.period === "matin") ?? null;
  const finImport = recentImports.find((item) => item.dateKey === effectiveDate && item.period === "fin_matinee") ?? null;
  const latestImport = finImport ?? morningImport;

  const importIds = [morningImport?.id, finImport?.id].filter(Boolean) as string[];
  const rowsByImportId = await loadSyntheseRowsByImportIds(importIds);
  const morningRows = morningImport ? rowsByImportId.get(morningImport.id) ?? [] : [];
  const finRows = finImport ? rowsByImportId.get(finImport.id) ?? [] : [];
  const latestRows = latestImport ? rowsByImportId.get(latestImport.id) ?? [] : [];
  const detailBundle = await loadDetailRowsByImportIds(importIds);
  const latestDetailRows = latestImport ? detailBundle.rowsByImportId.get(latestImport.id) ?? [] : [];
  const morningDetailRows = morningImport ? detailBundle.rowsByImportId.get(morningImport.id) ?? [] : [];
  const finDetailRows = finImport ? detailBundle.rowsByImportId.get(finImport.id) ?? [] : [];

  const { byRayon, namesById } = buildRayonOwnerIndex(employees);

  const rayonRows = latestRows
    .map((row) => {
      const employeeId = resolveRowEmployeeId(row, byRayon);
      return {
        ...row,
        employeeId,
        employeeName: employeeId ? namesById.get(employeeId) ?? null : null,
      } satisfies RuptureRayonRow;
    })
    .sort((left, right) => left.rayonNum - right.rayonNum || left.rayonLabel.localeCompare(right.rayonLabel, "fr"));

  const collaboratorRows = aggregateCollaboratorRows(
    employees,
    morningRows,
    finRows,
    latestRows,
    morningDetailRows,
    finDetailRows,
    latestDetailRows,
  );

  const historyImportIds = recentImports
    .filter((item) => isDateWithinRange(item.dateKey, effectiveDate, historyRange))
    .map((item) => item.id);
  const historyRowsByImportId = historyImportIds.length
    ? await loadSyntheseRowsByImportIds(historyImportIds)
    : new Map<string, ParsedRuptureRow[]>();

  return {
    employees,
    recentImports,
    availableDates,
    selectedDate: effectiveDate,
    morning: buildTeamSnapshot(morningImport, morningRows),
    fin: buildTeamSnapshot(finImport, finRows),
    latest: buildTeamSnapshot(latestImport, latestRows),
    collaboratorRows,
    historyRows: buildHistoryRows(employees, recentImports, historyRowsByImportId, effectiveDate, historyRange),
    rayonRows,
    detailRows: latestDetailRows,
    detailEnabled: detailBundle.detailEnabled,
  } satisfies RupturesDashboardData;
}

export async function loadLatestRupturesCountForToday() {
  const today = formatLocalIsoDate(new Date());
  const dashboard = await loadRupturesDashboard(today, "week");
  return dashboard.latest.collab;
}
