import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { inspectRuptureDetailFile, parseRuptureDetailFile } from "@/app/ruptures/lib/ruptures-parser";
import type { RuptureEmployee } from "@/lib/ruptures-store";

function makeDetailFile(rows: Array<Array<string | number>>) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Feuil1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new File([buffer], "ruptures-detail.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    lastModified: Date.now(),
  });
}

describe("ruptures detail parser", () => {
  it("reads shifted detail columns from header labels instead of hard-coded indexes", async () => {
    const employees: RuptureEmployee[] = [
      {
        id: "emp-1",
        name: "WASIM",
        actif: true,
        rupturesRayons: [479],
        matriculeMetier: "N000409787",
      },
    ];

    const file = makeDetailFile([
      ["Statut", "CUG", "Libellé produit", "Matricule", "Marché", "EAN", "Fournisseur", "Cause"],
      ["Attente Contrôle de Stock", "CUG-1", "ALSA MY MUG CAKE FACON COOKIE", "N000409787", 479, "1234567890123", "ALS", "Rupture Phantom"],
      ["Attente Mise en Rayon", "CUG-2", "AUC CACAHUETES ENROBEES GOUT", "N000409787", 479, "2222222222222", "AUCHAN", "Rupture Phantom"],
    ]);

    const summary = await inspectRuptureDetailFile(file);
    const parsed = await parseRuptureDetailFile(file, employees);

    expect(summary.rowCount).toBe(2);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      cug: "CUG-1",
      libelleProduit: "ALSA MY MUG CAKE FACON COOKIE",
      matriculeSource: "N000409787",
      marche: 479,
      statut: "Attente Contrôle de Stock",
      employeeId: "emp-1",
    });
    expect(parsed[1]?.statut).toBe("Attente Mise en Rayon");
  });
});
