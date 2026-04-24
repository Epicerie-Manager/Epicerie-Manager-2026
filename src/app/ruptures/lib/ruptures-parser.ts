import * as XLSX from "xlsx";
import { RUPTURE_COLLAB_STATUSES } from "@/lib/ruptures-store";
import type { ParsedRuptureRow, RuptureDetailRow, RuptureEmployee } from "@/lib/ruptures-store";

export type RuptureImportSourceInfo = {
  sourceImportedAt: string;
  sourceLabel: string;
};

export type RuptureDetailFileSummary = {
  rowCount: number;
};

const FIXED_COL_INDEX = {
  rayonNum: 3,
  rayonLabel: 4,
  totalATraiter: 23,
  ouvertesAujourdHui: 24,
} as const;

const COLLAB_HEADER_KEYS = {
  attentecontroledeStock: "attenteControleStock",
  attentemiseenrayon: "attenteMiseEnRayon",
  attentecorrectionparametrage: "attenteCorrectionParametrage",
  attentesuppressionbalisage: "attenteSuppressionBalisage",
  attentededemandedepreparation: "attenteDemandePreparation",
} as const;

type CollaboratorField = typeof COLLAB_HEADER_KEYS[keyof typeof COLLAB_HEADER_KEYS];

type HeaderMap = Record<CollaboratorField, number>;
type DetailField =
  | "cug"
  | "ean"
  | "libelleProduit"
  | "marche"
  | "matricule"
  | "fournisseur"
  | "cause"
  | "statut";
type DetailHeaderMap = Record<DetailField, number>;

function cellToString(value: unknown) {
  return String(value ?? "").trim();
}

function cellToInteger(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeHeader(value: unknown) {
  return cellToString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalIso(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function readWorkbook(file: File) {
  return file.arrayBuffer().then((buffer) => XLSX.read(buffer, { type: "array", cellDates: true }));
}

async function readSheetRows(file: File) {
  const workbook = await readWorkbook(file);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Le fichier ne contient aucune feuille exploitable.");
  }

  const sheet = workbook.Sheets[sheetName];
  return {
    workbook,
    rows: XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }),
  };
}

function isDetailFileHeader(headerRow: (string | number | null)[]) {
  const headers = headerRow.map(normalizeHeader);
  return headers.includes("cug") && headers.includes("matricule") && headers.includes("libelleproduit");
}

function buildDetailHeaderMap(headerRow: (string | number | null)[]) {
  const headers = headerRow.map(normalizeHeader);
  const findIndex = (candidates: string[]) => headers.findIndex((header) => candidates.includes(header));
  const mapping = {
    cug: findIndex(["cug"]),
    ean: findIndex(["ean", "codeean"]),
    libelleProduit: findIndex(["libelleproduit", "libellearticle", "produit", "designation"]),
    marche: findIndex(["marche", "rayon", "rayonnum", "numerorayon"]),
    matricule: findIndex(["matricule", "matriculesource", "collaborateurmatricule"]),
    fournisseur: findIndex(["fournisseur"]),
    cause: findIndex(["cause", "libellecause"]),
    statut: findIndex(["statut", "etat", "statutrupture"]),
  } satisfies Partial<DetailHeaderMap>;

  const missing = Object.entries(mapping)
    .filter(([, index]) => typeof index !== "number" || index < 0)
    .map(([field]) => field);

  if (missing.length) {
    throw new Error("Le fichier détail ruptures ne contient pas toutes les colonnes attendues.");
  }

  return mapping as DetailHeaderMap;
}

function resolveEmployeeByMatricule(
  matriculeSource: string,
  libelleProduit: string,
  employees: RuptureEmployee[],
) {
  const normalizedMatricule = cellToString(matriculeSource).toUpperCase();
  const employee = employees.find((item) => item.matriculeMetier === normalizedMatricule);
  if (employee) return employee.id;

  const isBatch = normalizedMatricule.startsWith("BATCH");
  const isBio = /\bBIO\b/i.test(libelleProduit);
  if (isBatch && isBio) {
    const kamel = employees.find((item) => item.name === "KAMEL");
    return kamel?.id ?? null;
  }

  return null;
}

function resolveSourceDate(workbook: XLSX.WorkBook, file: File) {
  const props = workbook.Props ?? {};
  const modifiedDate = props.ModifiedDate instanceof Date ? props.ModifiedDate : props.ModifiedDate ? new Date(props.ModifiedDate) : null;
  const createdDate = props.CreatedDate instanceof Date ? props.CreatedDate : props.CreatedDate ? new Date(props.CreatedDate) : null;

  if (modifiedDate && !Number.isNaN(modifiedDate.getTime())) {
    return {
      date: modifiedDate,
      label: "date du workbook Excel",
    };
  }

  if (createdDate && !Number.isNaN(createdDate.getTime())) {
    return {
      date: createdDate,
      label: "date du workbook Excel",
    };
  }

  return {
    date: new Date(file.lastModified),
    label: "date du fichier local",
  };
}

function buildHeaderMap(headerRow: (string | number | null)[]) {
  const mapping = {} as Partial<HeaderMap>;

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized === "attentecontroledeStock".toLowerCase()) {
      mapping.attenteControleStock = index;
    }
    if (normalized === "attentemiseenrayon") {
      mapping.attenteMiseEnRayon = index;
    }
    if (normalized === "attentecorrectionparametrage") {
      mapping.attenteCorrectionParametrage = index;
    }
    if (normalized === "attentesuppressionbalisage") {
      mapping.attenteSuppressionBalisage = index;
    }
    if (normalized === "attentededemandedepreparation") {
      mapping.attenteDemandePreparation = index;
    }
  });

  const missing = Object.keys(COLLAB_HEADER_KEYS)
    .map((key) => COLLAB_HEADER_KEYS[key as keyof typeof COLLAB_HEADER_KEYS])
    .filter((field) => typeof mapping[field] !== "number");

  if (missing.length) {
    throw new Error("Le fichier périmètre ne contient pas toutes les colonnes ruptures collaborateur attendues.");
  }

  return mapping as HeaderMap;
}

function resolveEmployeeByRayon(rayonNum: number, employees: RuptureEmployee[]) {
  const matches = employees.filter((employee) => employee.rupturesRayons.includes(rayonNum));
  if (matches.length !== 1) return null;
  return matches[0].id;
}

export async function extractRupturesImportSourceInfo(file: File): Promise<RuptureImportSourceInfo> {
  const workbook = await readWorkbook(file);
  const resolved = resolveSourceDate(workbook, file);
  return {
    sourceImportedAt: toLocalIso(resolved.date),
    sourceLabel: resolved.label,
  };
}

export async function parseRupturePerimetreFile(file: File, employees: RuptureEmployee[]) {
  const { rows } = await readSheetRows(file);
  if (!rows.length) {
    throw new Error("Le fichier périmètre est vide.");
  }

  const headerMap = buildHeaderMap(rows[0] ?? []);
  const parsedRows: ParsedRuptureRow[] = rows
    .slice(1)
    .map((row) => {
      const rayonNum = cellToInteger(row[FIXED_COL_INDEX.rayonNum]);
      const rayonLabel = cellToString(row[FIXED_COL_INDEX.rayonLabel]);
      const totalATraiter = cellToInteger(row[FIXED_COL_INDEX.totalATraiter]);
      const ouvertesAujourdHui = cellToInteger(row[FIXED_COL_INDEX.ouvertesAujourdHui]);
      const attenteControleStock = cellToInteger(row[headerMap.attenteControleStock]);
      const attenteMiseEnRayon = cellToInteger(row[headerMap.attenteMiseEnRayon]);
      const attenteCorrectionParametrage = cellToInteger(row[headerMap.attenteCorrectionParametrage]);
      const attenteSuppressionBalisage = cellToInteger(row[headerMap.attenteSuppressionBalisage]);
      const attenteDemandePreparation = cellToInteger(row[headerMap.attenteDemandePreparation]);
      const sousResponsabiliteCollab =
        attenteControleStock +
        attenteMiseEnRayon +
        attenteCorrectionParametrage +
        attenteSuppressionBalisage +
        attenteDemandePreparation;

      return {
        rayonNum,
        rayonLabel,
        employeeId: resolveEmployeeByRayon(rayonNum, employees),
        totalATraiter,
        ouvertesAujourdHui,
        attenteControleStock,
        attenteMiseEnRayon,
        attenteCorrectionParametrage,
        attenteSuppressionBalisage,
        attenteDemandePreparation,
        sousResponsabiliteCollab,
        pctTraitement: null,
        nbTraite: null,
        collabMatin: null,
        collabFin: null,
      } satisfies ParsedRuptureRow;
    })
    .filter((row) => row.rayonNum > 0 && (row.rayonLabel || row.totalATraiter > 0 || row.sousResponsabiliteCollab > 0))
    .sort((left, right) => left.rayonNum - right.rayonNum || left.rayonLabel.localeCompare(right.rayonLabel, "fr"));

  if (!parsedRows.length) {
    throw new Error("Aucune ligne ruptures exploitable n'a été trouvée dans le fichier périmètre.");
  }

  return parsedRows;
}

export async function inspectRuptureDetailFile(file: File): Promise<RuptureDetailFileSummary> {
  const { rows } = await readSheetRows(file);
  if (!rows.length || !isDetailFileHeader(rows[0] ?? [])) {
    throw new Error("Le second fichier n'est pas reconnu. Attendu: Gestion des ruptures, liste des ruptures.");
  }

  const headerMap = buildDetailHeaderMap(rows[0] ?? []);

  const rowCount = rows
    .slice(1)
    .filter((row) =>
      cellToString(row[headerMap.cug]) ||
      cellToString(row[headerMap.libelleProduit]) ||
      cellToString(row[headerMap.matricule]),
    )
    .length;

  return { rowCount };
}

export async function parseRuptureDetailFile(file: File, employees: RuptureEmployee[]) {
  const { rows } = await readSheetRows(file);
  if (!rows.length || !isDetailFileHeader(rows[0] ?? [])) {
    throw new Error("Le second fichier n'est pas reconnu. Attendu: Gestion des ruptures, liste des ruptures.");
  }
  const headerMap = buildDetailHeaderMap(rows[0] ?? []);

  return rows
    .slice(1)
    .map((row) => {
      const libelleProduit = cellToString(row[headerMap.libelleProduit]);
      const matriculeSource = cellToString(row[headerMap.matricule]).toUpperCase() || null;
      const employeeId = resolveEmployeeByMatricule(matriculeSource ?? "", libelleProduit, employees);

      return {
        cug: cellToString(row[headerMap.cug]) || null,
        ean: cellToString(row[headerMap.ean]) || null,
        libelleProduit,
        marche: cellToString(row[headerMap.marche]) ? cellToInteger(row[headerMap.marche]) : null,
        matriculeSource,
        fournisseur: cellToString(row[headerMap.fournisseur]) || null,
        cause: cellToString(row[headerMap.cause]) || null,
        statut: cellToString(row[headerMap.statut]),
        isBio: /\bBIO\b/i.test(libelleProduit),
        employeeId,
      } satisfies Omit<RuptureDetailRow, "id" | "importId">;
    })
    .filter((row) => row.libelleProduit)
    .filter((row) => RUPTURE_COLLAB_STATUSES.has(row.statut));
}
