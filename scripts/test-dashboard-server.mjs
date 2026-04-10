import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const host = "127.0.0.1";
const port = 3210;
const reportDir = path.join(cwd, ".test-dashboard");
const reportFile = path.join(reportDir, "last-run.json");
const historyFile = path.join(reportDir, "history.json");
const htmlFile = path.join(cwd, "tools", "test-dashboard", "index.html");
const HISTORY_LIMIT = 20;

const suiteCatalog = [
  { match: "src/lib/absence-days.test.ts", id: "absence-days", family: "Bases", label: "Calcul des absences", description: "Verifie le comptage des jours et l'exclusion du dimanche." },
  { match: "src/components/exports/cp-print-utils.test.ts", id: "cp-export", family: "Fonctionnalites recentes", label: "Export Planning CP", description: "Verifie les semaines ISO, le filtrage des conges et les periodes manuelles." },
  { match: "src/app/api/manager-mobile/login/route.test.ts", id: "manager-login", family: "Securite", label: "Login manager mobile", description: "Verifie les erreurs PIN, le blocage apres trop de tentatives et le succes du login." },
];

let latestRun = await loadJsonFile(reportFile, null);
let runHistory = await loadJsonFile(historyFile, []);
let currentRun = null;

function normalizePath(filePath) {
  return String(filePath ?? "").replaceAll("\\", "/");
}

function uniqueFamilies() {
  return Array.from(new Set(suiteCatalog.map((suite) => suite.family))).sort((a, b) => a.localeCompare(b, "fr"));
}

function suiteMetaFromName(filePath) {
  const normalized = normalizePath(filePath);
  return suiteCatalog.find((entry) => normalized.endsWith(entry.match)) ?? {
    id: normalized,
    family: "Autres",
    label: path.basename(normalized),
    description: "Suite de tests non cataloguee.",
    match: normalized,
  };
}

function summarizeSuite(result) {
  const assertions = Array.isArray(result.assertionResults) ? result.assertionResults : [];
  const passed = assertions.filter((item) => item.status === "passed").length;
  const failed = assertions.filter((item) => item.status === "failed").length;
  const pending = assertions.filter((item) => ["pending", "skipped", "todo"].includes(item.status)).length;
  const total = assertions.length;
  let status = "not_run";
  if (total > 0 && failed === 0 && pending === 0 && passed === total) status = "ok";
  else if (failed > 0 && passed > 0) status = "partial";
  else if (failed > 0) status = "ko";
  else if (pending > 0) status = "partial";
  const meta = suiteMetaFromName(result.name);
  return {
    ...meta,
    file: normalizePath(result.name),
    status,
    total,
    passed,
    failed,
    pending,
    durationMs: Math.max(0, Math.round((result.endTime ?? 0) - (result.startTime ?? 0))),
    tests: assertions.map((test) => ({
      title: test.title,
      fullName: test.fullName,
      status: test.status === "passed" ? "ok" : test.status === "failed" ? "ko" : "partial",
      durationMs: Math.max(0, Math.round(test.duration ?? 0)),
      failureMessages: Array.isArray(test.failureMessages) ? test.failureMessages : [],
    })),
  };
}

function buildFamilies(suites) {
  const byFamily = new Map();
  for (const suite of suites) {
    const current = byFamily.get(suite.family) ?? { label: suite.family, status: "not_run", total: 0, passed: 0, failed: 0, pending: 0, suites: [] };
    current.total += suite.total;
    current.passed += suite.passed;
    current.failed += suite.failed;
    current.pending += suite.pending;
    current.suites.push(suite.id);
    byFamily.set(suite.family, current);
  }
  return Array.from(byFamily.values()).map((family) => {
    let status = "not_run";
    if (family.total > 0 && family.failed === 0 && family.pending === 0 && family.passed === family.total) status = "ok";
    else if (family.failed > 0 && family.passed > 0) status = "partial";
    else if (family.failed > 0) status = "ko";
    else if (family.pending > 0) status = "partial";
    return { ...family, status };
  });
}

function resolveSelection(selection) {
  const requestedSuites = Array.isArray(selection?.suiteIds) ? selection.suiteIds.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  const requestedFamilies = Array.isArray(selection?.families) ? selection.families.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  const suites = requestedSuites.length || requestedFamilies.length
    ? suiteCatalog.filter((suite) => requestedSuites.includes(suite.id) || requestedFamilies.includes(suite.family))
    : suiteCatalog;
  return {
    suiteIds: suites.map((suite) => suite.id),
    families: Array.from(new Set(suites.map((suite) => suite.family))).sort((a, b) => a.localeCompare(b, "fr")),
    files: suites.map((suite) => path.normalize(suite.match)),
  };
}

function buildPayload(report, stdout, stderr, selection) {
  const suites = (Array.isArray(report.testResults) ? report.testResults : []).map(summarizeSuite);
  const families = buildFamilies(suites);
  return {
    generatedAt: new Date().toISOString(),
    overallStatus: report.success ? "ok" : "ko",
    selection,
    summary: {
      totalSuites: suites.length,
      totalTests: report.numTotalTests ?? suites.reduce((sum, suite) => sum + suite.total, 0),
      passedTests: report.numPassedTests ?? suites.reduce((sum, suite) => sum + suite.passed, 0),
      failedTests: report.numFailedTests ?? suites.reduce((sum, suite) => sum + suite.failed, 0),
      pendingTests: report.numPendingTests ?? suites.reduce((sum, suite) => sum + suite.pending, 0),
      totalFamilies: families.length,
      failedFamilies: families.filter((item) => item.status === "ko").length,
      partialFamilies: families.filter((item) => item.status === "partial").length,
      durationMs: typeof report.startTime === "number" ? Math.max(0, Date.now() - report.startTime) : null,
    },
    families,
    suites,
    logs: {
      stdout: String(stdout ?? "").trim(),
      stderr: String(stderr ?? "").trim(),
    },
  };
}

function buildFailurePayload(stdout, stderr, error, selection) {
  return {
    generatedAt: new Date().toISOString(),
    overallStatus: "ko",
    selection,
    summary: { totalSuites: 0, totalTests: 0, passedTests: 0, failedTests: 0, pendingTests: 0, totalFamilies: 0, failedFamilies: 0, partialFamilies: 0, durationMs: null },
    families: [],
    suites: [],
    logs: {
      stdout: String(stdout ?? "").trim(),
      stderr: [String(stderr ?? "").trim(), error instanceof Error ? error.message : String(error)].filter(Boolean).join("\n"),
    },
  };
}

async function loadJsonFile(filePath, fallbackValue) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

async function saveJsonFile(filePath, value) {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function persistRun(payload) {
  latestRun = payload;
  runHistory = [
    {
      generatedAt: payload.generatedAt,
      overallStatus: payload.overallStatus,
      selection: payload.selection,
      summary: payload.summary,
      failingSuites: payload.suites.filter((suite) => suite.status !== "ok").map((suite) => ({ id: suite.id, label: suite.label, status: suite.status })),
    },
    ...runHistory,
  ].slice(0, HISTORY_LIMIT);
  await saveJsonFile(reportFile, latestRun);
  await saveJsonFile(historyFile, runHistory);
}

function extractJsonPayload(output) {
  const trimmed = String(output ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Impossible de lire le rapport JSON de Vitest.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function readRequestJson(request) {
  return await new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => { body += String(chunk); });
    request.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function runVitest(selectionInput = {}) {
  if (currentRun) return currentRun;
  const selection = resolveSelection(selectionInput);
  const files = selection.files.length ? selection.files : suiteCatalog.map((suite) => suite.match);
  currentRun = new Promise((resolve) => {
    const command = process.platform === "win32" ? "cmd.exe" : "npx";
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", `npx vitest run --reporter=json ${files.join(" ")}`]
      : ["vitest", "run", "--reporter=json", ...files];
    const child = spawn(command, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", async (code) => {
      try {
        const payload = buildPayload(extractJsonPayload(stdout), stdout, stderr, selection);
        await persistRun(payload);
        resolve({ ok: code === 0, payload });
      } catch (error) {
        const payload = buildFailurePayload(stdout, stderr, error, selection);
        await persistRun(payload);
        resolve({ ok: false, payload });
      } finally {
        currentRun = null;
      }
    });
  });
  return currentRun;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await fs.readFile(htmlFile, "utf8"));
    return;
  }

  if (request.method === "GET" && ["/api/catalog", "/api/results"].includes(url.pathname)) {
    sendJson(response, 200, {
      latestRun,
      history: runHistory,
      families: uniqueFamilies(),
      suites: suiteCatalog,
      isRunning: Boolean(currentRun),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/run") {
    const run = await runVitest(await readRequestJson(request));
    sendJson(response, run.ok ? 200 : 500, {
      latestRun: run.payload,
      history: runHistory,
      families: uniqueFamilies(),
      suites: suiteCatalog,
      isRunning: false,
    });
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Tableau de bord des tests disponible sur http://${host}:${port}`);
  console.log("Utilise Ctrl+C pour arreter le serveur.");
});
