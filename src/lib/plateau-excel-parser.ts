import * as XLSX from "xlsx";

export type PlateauExcelMeta = {
  weekNumber: number;
  weekLabel: string;
  implantationDate: string;
  desimplantationDate: string;
  sheetNames: string[];
};

function toIsoDateFromParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function toIsoDate(value: unknown): string {
  if (value == null || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return toIsoDateFromParts(parsed.y, parsed.m, parsed.d);
    }
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const frenchMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (frenchMatch) {
    const day = Number(frenchMatch[1]);
    const month = Number(frenchMatch[2]);
    const year = Number(frenchMatch[3].length === 2 ? `20${frenchMatch[3]}` : frenchMatch[3]);
    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return toIsoDateFromParts(year, month, day);
    }
  }

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return "";
}

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getCellValue(sheet: XLSX.WorkSheet, cellRef: string) {
  const cell = sheet[cellRef];
  return cell?.v ?? cell?.w ?? null;
}

export async function parsePlateauExcelMeta(file: File | Blob | ArrayBuffer): Promise<PlateauExcelMeta> {
  const buffer =
    file instanceof ArrayBuffer
      ? file
      : await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellFormula: true,
  });

  const sheetNameA =
    workbook.SheetNames.find((name) => name.trim().toUpperCase().startsWith("PLATEAU A")) ?? "";
  if (!sheetNameA) {
    throw new Error("Onglet PLATEAU A introuvable dans le fichier Excel.");
  }

  const sheetA = workbook.Sheets[sheetNameA];
  const implantationDate = toIsoDate(getCellValue(sheetA, "Y4"));
  const desimplantationDate = toIsoDate(getCellValue(sheetA, "Y5"));

  if (!implantationDate) {
    throw new Error("Date d'implantation introuvable en Y4 dans PLATEAU A.");
  }
  if (!desimplantationDate) {
    throw new Error("Date de désimplantation introuvable en Y5 dans PLATEAU A.");
  }

  const weekLabel = String(getCellValue(sheetA, "G1") ?? "")
    .split("\n")[0]
    .trim();
  const weekNumber = isoWeekNumber(new Date(`${implantationDate}T12:00:00`));

  return {
    weekNumber,
    weekLabel,
    implantationDate,
    desimplantationDate,
    sheetNames: workbook.SheetNames.filter((name) => !name.toUpperCase().includes("GABARIT")),
  };
}
