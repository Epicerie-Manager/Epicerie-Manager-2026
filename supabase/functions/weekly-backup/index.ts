import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEST_EMAIL = Deno.env.get("BACKUP_NOTIFY_EMAIL") ?? "rachid.ben91@gmail.com";
const BACKUP_BUCKET = "backups";
const TIME_ZONE = "Europe/Paris";

const TABLES = [
  { name: "planning_entries", label: "Planning" },
  { name: "absences", label: "Absences" },
  { name: "employees", label: "RH - Employes" },
  { name: "profiles", label: "RH - Profils" },
  { name: "cycle_repos", label: "RH - Cycles repos" },
  { name: "balisage_mensuel", label: "Controle balisage" },
  { name: "ruptures_detail", label: "Ruptures detail" },
  { name: "ruptures_synthese", label: "Ruptures synthese" },
  { name: "ruptures_imports", label: "Ruptures imports" },
  { name: "employee_followups", label: "Suivis collaborateurs" },
  { name: "employee_followup_items", label: "Suivis - items" },
  { name: "employee_followup_sections", label: "Suivis - sections" },
  { name: "plans_tg", label: "Plans TG" },
  { name: "plans_tg_entries", label: "Plans TG - lignes" },
  { name: "tg_rayons_config", label: "Plans TG - configuration rayons" },
  { name: "tg_custom_mechanics", label: "Plans TG - mecaniques personnalisees" },
  { name: "annonces", label: "Annonces" },
  { name: "documents", label: "Documents" },
  { name: "plateau_operations", label: "Plateau - operations" },
  { name: "plateau_assets", label: "Plateau - assets" },
  { name: "binomes_repos", label: "Binomes repos" },
  { name: "presence_thresholds", label: "Seuils presence" },
  { name: "tri_caddie", label: "Tri caddie" },
] as const;

type TableSummary = {
  name: string;
  label: string;
  count: number;
  ok: boolean;
  path: string | null;
  error?: string;
};

function assertRequiredEnv(name: string, value: string) {
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
}

function getIsoWeekNumber(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getParisDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("fr-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    isoTimestamp: `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`,
    displayLong: new Intl.DateTimeFormat("fr-FR", {
      timeZone: TIME_ZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  const escapedValue = stringValue.replace(/"/g, "\"\"");
  return /[;"\n\r]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "Aucune donnee\n";

  const headerSet = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => headerSet.add(key)));
  const headers = Array.from(headerSet);
  const lines = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(";")),
  ];
  return lines.join("\n");
}

async function fetchAllRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
) {
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
  }

  return rows;
}

async function uploadTextFile(
  supabase: ReturnType<typeof createClient>,
  path: string,
  content: string,
  contentType: string,
) {
  const encoder = new TextEncoder();
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(path, encoder.encode(content), {
      contentType,
      upsert: true,
    });

  if (error) throw error;
}

function buildHtmlBody(args: {
  runLabel: string;
  isoDate: string;
  weekNumber: number;
  folderPath: string;
  summary: TableSummary[];
}) {
  const rowsHtml = args.summary
    .map((entry) => {
      const status = entry.ok
        ? `${entry.count} ligne(s)`
        : `<span style="color:#D40511">Erreur</span>`;
      return `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f0ece6;">${entry.label}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f0ece6;text-align:right;font-weight:500;">${status}</td>
        </tr>
      `;
    })
    .join("");

  const successCount = args.summary.filter((entry) => entry.ok).length;

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:#D40511;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Backup hebdomadaire</h1>
        <p style="color:rgba(255,255,255,0.82);margin:4px 0 0;font-size:14px;">
          Epicerie Manager 2026 — sauvegarde stockee dans Supabase Storage
        </p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e8e3dd;border-top:none;">
        <p style="color:#6b6560;font-size:14px;margin:0 0 18px;">
          Sauvegarde automatique executee le <strong>${args.runLabel}</strong><br>
          Semaine ${args.weekNumber} — dossier <code>${args.folderPath}</code>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f5f0ea;">
              <th style="padding:8px 12px;text-align:left;color:#6b6560;font-weight:500;">Table</th>
              <th style="padding:8px 12px;text-align:right;color:#6b6560;font-weight:500;">Export</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p style="color:#6b6560;font-size:12px;margin:20px 0 0;padding-top:16px;border-top:1px solid #f0ece6;">
          ${successCount} fichier(s) CSV enregistres dans le bucket <strong>${BACKUP_BUCKET}</strong>.<br>
          Date du backup : ${args.isoDate}
        </p>
      </div>
    </div>
  `;
}

async function sendNotificationEmail(html: string, weekNumber: number) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Epicerie Manager <onboarding@resend.dev>",
      to: [DEST_EMAIL],
      subject: `Backup sem. ${weekNumber} disponible dans Supabase`,
      html,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Resend a refuse l'envoi: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function isAuthorizedRequest(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  return token === SUPABASE_SERVICE_ROLE_KEY;
}

Deno.serve(async (req) => {
  try {
    assertRequiredEnv("SUPABASE_URL", SUPABASE_URL);
    assertRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
    assertRequiredEnv("RESEND_API_KEY", RESEND_API_KEY);

    if (!["POST", "GET"].includes(req.method)) {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!isAuthorizedRequest(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();
    const paris = getParisDateParts(now);
    const weekNumber = getIsoWeekNumber(now);
    const folderPath = `weekly/${paris.year}/week-${String(weekNumber).padStart(2, "0")}/${paris.isoTimestamp}`;
    const summary: TableSummary[] = [];

    for (const table of TABLES) {
      try {
        const rows = await fetchAllRows(supabase, table.name);
        const csv = toCsv(rows);
        const filePath = `${folderPath}/${table.name}.csv`;

        await uploadTextFile(supabase, filePath, csv, "text/csv; charset=utf-8");
        summary.push({
          name: table.name,
          label: table.label,
          count: rows.length,
          ok: true,
          path: filePath,
        });
      } catch (error) {
        console.error(`Backup table error for ${table.name}`, error);
        summary.push({
          name: table.name,
          label: table.label,
          count: 0,
          ok: false,
          path: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const manifestPath = `${folderPath}/manifest.json`;
    await uploadTextFile(
      supabase,
      manifestPath,
      JSON.stringify(
        {
          bucket: BACKUP_BUCKET,
          generatedAt: now.toISOString(),
          generatedAtParis: paris.displayLong,
          weekNumber,
          summary,
        },
        null,
        2,
      ),
      "application/json; charset=utf-8",
    );

    const html = buildHtmlBody({
      runLabel: paris.displayLong,
      isoDate: paris.isoDate,
      weekNumber,
      folderPath,
      summary,
    });

    const emailResult = await sendNotificationEmail(html, weekNumber);

    return new Response(
      JSON.stringify({
        success: true,
        bucket: BACKUP_BUCKET,
        folderPath,
        weekNumber,
        manifestPath,
        emailId: emailResult.id ?? null,
        summary,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("weekly-backup failed", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
