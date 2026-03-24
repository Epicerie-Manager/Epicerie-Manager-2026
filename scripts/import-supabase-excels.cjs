const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_FILES = {
  planning: 'C:/Users/Maison/Desktop/Planning Epicerie 2026.xlsx',
  tg: 'C:/Users/Maison/Desktop/PLAN TG EPICERIE 2026.xlsx',
  balisage: 'C:/Users/Maison/Desktop/Suivi contrôle balisage - épicerie 2026.xlsx',
};

const MONTH_NAME_TO_NUMBER = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(value) {
  const normalized = stripAccents(value)
    .toUpperCase()
    .replace(/[?.,;:!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Exclusion business demand: NADIA no longer exists in the team.
  if (normalized === 'NADIA') return '';
  return normalized;
}

function normalizeText(value) {
  return stripAccents(String(value || ''))
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArgs(argv) {
  const args = {
    planning: DEFAULT_FILES.planning,
    tg: DEFAULT_FILES.tg,
    balisage: DEFAULT_FILES.balisage,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token.startsWith('--planning=')) {
      args.planning = token.split('=').slice(1).join('=');
      continue;
    }
    if (token.startsWith('--tg=')) {
      args.tg = token.split('=').slice(1).join('=');
      continue;
    }
    if (token.startsWith('--balisage=')) {
      args.balisage = token.split('=').slice(1).join('=');
      continue;
    }
  }

  return args;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const out = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  });
  return out;
}

function getEnv() {
  const cwd = process.cwd();
  const envLocal = readEnvFile(path.join(cwd, '.env.local'));
  return {
    ...envLocal,
    ...process.env,
  };
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier ${label} introuvable: ${filePath}`);
  }
}

function workbookRows(workbook, sheetName, raw = false) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw, blankrows: false });
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts || !parts.y || !parts.m || !parts.d) return null;
    return new Date(parts.y, parts.m - 1, parts.d);
  }
  const txt = String(value).trim();
  if (!txt) return null;

  const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fr = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (fr) {
    const yyyy = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    const mm = fr[2].padStart(2, '0');
    const dd = fr[1].padStart(2, '0');
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(txt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value) {
  const d = parseDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const txt = String(value).replace(/\s/g, '').replace(',', '.');
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}

function normalizeDayCode(value) {
  const txt = normalizeText(value);
  const map = {
    LUNDI: 'LUN',
    MARDI: 'MAR',
    MERCREDI: 'MER',
    JEUDI: 'JEU',
    VENDREDI: 'VEN',
    SAMEDI: 'SAM',
    DIMANCHE: 'DIM',
    LUN: 'LUN',
    MAR: 'MAR',
    MER: 'MER',
    JEU: 'JEU',
    VEN: 'VEN',
    SAM: 'SAM',
    DIM: 'DIM',
  };
  return map[txt] || null;
}

function parseEmployeeType(typeRaw, obsRaw) {
  const typeTxt = normalizeText(typeRaw);
  const obsTxt = normalizeText(obsRaw);
  if (typeTxt.includes('MATIN')) return 'MATIN';
  if (typeTxt.includes('APRES')) return 'APRES-MIDI';
  if (obsTxt.includes('ETUDIANT')) return 'ETUDIANT';
  return 'MATIN';
}

function parseEmployeeActive(obsRaw) {
  const obsTxt = normalizeText(obsRaw);
  if (!obsTxt) return true;
  if (obsTxt.includes('CONGE MAT')) return false;
  if (obsTxt.includes('INACTIF')) return false;
  return true;
}

function isTimeRange(value) {
  if (!value) return false;
  const txt = normalizeText(value).replace(/\s+/g, '');
  return /\d{1,2}H\d{0,2}-\d{1,2}H\d{0,2}/.test(txt);
}

function mapPlanningStatus(cellValue) {
  const raw = cellValue === null || cellValue === undefined ? '' : String(cellValue).trim();
  if (!raw || raw === '#N/A') {
    return { statut: 'PRESENT', horaire_custom: null };
  }

  const txt = normalizeText(raw);

  if (txt === 'RH') return { statut: 'RH', horaire_custom: null };
  if (txt === 'CP') return { statut: 'CP', horaire_custom: null };
  if (txt === 'X') return { statut: 'ABSENT', horaire_custom: null };
  if (txt === 'FERIE') return { statut: 'FERIE', horaire_custom: null };
  if (txt === 'FORM' || txt === 'FORMATION') return { statut: 'FORMATION', horaire_custom: null };
  if (txt === 'C.M' || txt.includes('CONGE MAT')) return { statut: 'CONGE_MAT', horaire_custom: null };
  if (txt.includes('MAL')) return { statut: 'MAL', horaire_custom: null };

  if (isTimeRange(raw)) {
    return { statut: 'PRESENT', horaire_custom: raw };
  }

  return { statut: 'PRESENT', horaire_custom: null };
}

function parsePlanningWorkbook(planningPath) {
  const wb = XLSX.readFile(planningPath, { cellDates: false, raw: true });

  const employeesRows = workbookRows(wb, 'EMPLOYES', true);
  const employees = [];
  const binomesRepos = [];

  for (let i = 1; i < employeesRows.length; i += 1) {
    const row = employeesRows[i] || [];
    const name = normalizeName(row[0]);
    if (!name || name === 'TOUS') continue;

    const employee = {
      name,
      type: parseEmployeeType(row[1], row[5]),
      horaire_standard: row[2] ? String(row[2]).trim() : null,
      horaire_mardi: row[3] ? String(row[3]).trim() : null,
      horaire_samedi: row[4] ? String(row[4]).trim() : null,
      observation: row[5] ? String(row[5]).trim() : null,
      actif: parseEmployeeActive(row[5]),
    };
    employees.push(employee);

    const binomeLabel = normalizeText(row[7]);
    if (binomeLabel.startsWith('BINOME REPOS')) {
      const binomeNumber = Number(binomeLabel.replace(/[^0-9]/g, '')) || null;
      const employee1 = normalizeName(row[8]);
      const employee2 = normalizeName(row[9]);
      if (binomeNumber && employee1 && employee2) {
        binomesRepos.push({
          mois: '2026-01',
          binome_number: binomeNumber,
          employee1_name: employee1,
          employee2_name: employee2,
        });
      }
    }
  }
  const knownEmployeeNames = new Set(employees.map((employee) => employee.name));

  const cycleRows = workbookRows(wb, 'CYCLE_REPOS', true);
  const cycleRepos = [];
  for (let i = 1; i < cycleRows.length; i += 1) {
    const row = cycleRows[i] || [];
    const name = normalizeName(row[0]);
    if (!name) continue;
    for (let s = 1; s <= 2; s += 1) {
      const day = normalizeDayCode(row[1 + s]);
      if (!day) continue;
      cycleRepos.push({
        employee_name: name,
        semaine_cycle: s,
        jour_repos: day,
      });
    }
  }

  const modeleRows = workbookRows(wb, 'MODELE', true);
  const triCaddie = [];
  const triRowIndex = modeleRows.findIndex((row) => (row || []).some((cell) => normalizeText(cell).includes('TRI CADDIE')));
  if (triRowIndex >= 0) {
    const namesRow = modeleRows[triRowIndex + 1] || [];
    const daysRow = modeleRows[triRowIndex + 2] || [];
    for (let c = 0; c < daysRow.length; c += 1) {
      const day = normalizeDayCode(daysRow[c]);
      if (!day) continue;
      const employee1 = normalizeName(namesRow[c]);
      const employee2 = normalizeName(namesRow[c + 1]);
      if (!employee1 || !employee2) continue;
      triCaddie.push({
        mois: '2026-01',
        jour_semaine: day,
        employee1_name: employee1,
        employee2_name: employee2,
      });
      c += 1;
    }
  }

  const monthSheetPattern = /^(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\s+20\d{2}$/;
  const planningMap = new Map();

  wb.SheetNames.filter((name) => monthSheetPattern.test(normalizeText(name))).forEach((sheetName) => {
    const rows = workbookRows(wb, sheetName, true);
    if (!rows.length) return;

    const headerRow = rows[0] || [];
    const employeeColumns = [];
    for (let c = 6; c < headerRow.length; c += 1) {
      const employeeName = normalizeName(headerRow[c]);
      if (!employeeName) continue;
      if (employeeName.includes('TRI CADDIE')) continue;
      if (employeeName.includes('COMMENT')) continue;
      if (!knownEmployeeNames.has(employeeName)) continue;
      employeeColumns.push({ col: c, name: employeeName });
    }

    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r] || [];
      const isoDate = toIsoDate(row[1]);
      if (!isoDate) continue;

      const year = Number(isoDate.slice(0, 4));
      if (year < 2025 || year > 2027) continue;

      employeeColumns.forEach(({ col, name }) => {
        const parsed = mapPlanningStatus(row[col]);
        const key = `${isoDate}__${name}`;
        planningMap.set(key, {
          date: isoDate,
          employee_name: name,
          statut: parsed.statut,
          horaire_custom: parsed.horaire_custom,
        });
      });
    }
  });

  const absencesRows = workbookRows(wb, 'EXCEPTIONS', true);
  const absences = [];
  for (let i = 2; i < absencesRows.length; i += 1) {
    const row = absencesRows[i] || [];
    const startDate = toIsoDate(row[0]);
    const endDate = toIsoDate(row[1]);
    const employeeName = normalizeName(row[2]);
    const rawType = normalizeText(row[3]);
    if (!startDate || !endDate || !employeeName || !rawType) continue;

    let type = 'AUTRE';
    if (rawType.includes('CONGE MAT')) type = 'CONGE_MAT';
    else if (rawType === 'CP') type = 'CP';
    else if (rawType.includes('MAL')) type = 'MAL';
    else if (rawType.includes('FERIE')) type = 'FERIE';
    else if (rawType.includes('FORM')) type = 'FORM';

    absences.push({
      employee_name: employeeName,
      type,
      date_debut: startDate,
      date_fin: endDate,
      statut: 'APPROUVE',
      note: String(row[3] || '').trim() || null,
    });
  }

  return {
    employees,
    cycleRepos,
    binomesRepos,
    triCaddie,
    planningEntries: Array.from(planningMap.values()),
    absences,
  };
}

function parseFrenchDateParts(dayRaw, monthRaw, yearRaw) {
  const day = Number(dayRaw);
  const monthName = stripAccents(String(monthRaw || '')).toLowerCase();
  const month = MONTH_NAME_TO_NUMBER[monthName];
  const year = Number(yearRaw);
  if (!day || !month || !year) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseTgWorkbook(tgPath) {
  const wb = XLSX.readFile(tgPath, { cellDates: true, raw: false });
  const dataRows = workbookRows(wb, 'DATA_TG');

  const weekMeta = new Map();

  wb.SheetNames.forEach((sheetName) => {
    const normalized = normalizeText(sheetName);
    if (!/^\d{2}\s/.test(normalized)) return;
    const rows = workbookRows(wb, sheetName);
    const row1 = rows[0] || [];
    const tract = String(row1[1] || '');
    const match = tract.match(/Semaine\s+(\d+)\s*>\s*du\s+(\d{1,2})\s+([A-Za-z\u00C0-\u017F]+)\s+au\s+(\d{1,2})\s+([A-Za-z\u00C0-\u017F]+)\s+(\d{4})/i);

    let weekNum = null;
    let dateDe = null;
    let dateA = null;
    let label = sheetName;

    if (match) {
      weekNum = Number(match[1]);
      dateDe = parseFrenchDateParts(match[2], match[3], match[6]);
      dateA = parseFrenchDateParts(match[4], match[5], match[6]);
      label = `S${String(weekNum)} - du ${match[2]} au ${match[4]} ${stripAccents(match[5]).toLowerCase()} ${match[6]}`;
    }

    weekMeta.set(sheetName, {
      label,
      semaine_de: weekNum ? `S${String(weekNum)}` : null,
      semaine_a: weekNum ? `S${String(weekNum)}` : null,
      date_de: dateDe,
      date_a: dateA,
      source_week: sheetName,
    });
  });

  const entriesMap = new Map();

  for (let i = 1; i < dataRows.length; i += 1) {
    const row = dataRows[i] || [];
    const week = String(row[0] || '').trim();
    const rayon = String(row[1] || '').trim();
    const familleRaw = String(row[2] || '').trim();
    const familleNorm = normalizeText(familleRaw);
    const famille = familleNorm.includes('SUCR') ? 'SUCRE' : 'SALE';
    const type = normalizeText(row[3]);
    const responsable = normalizeName(row[4]);
    const produit = row[5] ? String(row[5]).trim() : '';
    const quantite = row[6] ? String(row[6]).trim() : '';
    const mecanique = row[7] ? String(row[7]).trim() : '';

    if (!week || !rayon || !famille) continue;

    const key = `${week}__${rayon}__${famille}`;
    if (!entriesMap.has(key)) {
      entriesMap.set(key, {
        week,
        rayon,
        famille,
        gbProducts: [],
        tgResponsables: [],
        tgProducts: [],
        tgQuantites: [],
        tgMecaniques: [],
      });
    }

    const entry = entriesMap.get(key);
    if (type === 'GB') {
      if (produit) entry.gbProducts.push(produit);
    } else if (type === 'TG') {
      if (responsable) entry.tgResponsables.push(responsable);
      if (produit) entry.tgProducts.push(produit);
      if (quantite) entry.tgQuantites.push(quantite);
      if (mecanique) entry.tgMecaniques.push(mecanique);
    }
  }

  const weekLabels = new Set(Array.from(entriesMap.values()).map((e) => e.week));
  const plans = Array.from(weekLabels).map((week) => {
    const meta = weekMeta.get(week) || {
      label: week,
      semaine_de: null,
      semaine_a: null,
      date_de: null,
      date_a: null,
      source_week: week,
    };
    return {
      label: meta.label,
      semaine_de: meta.semaine_de,
      semaine_a: meta.semaine_a,
      date_de: meta.date_de,
      date_a: meta.date_a,
      source_week: meta.source_week,
    };
  });

  const entries = Array.from(entriesMap.values()).map((entry) => {
    const meta = weekMeta.get(entry.week) || { label: entry.week };
    return {
      plan_label: meta.label,
      rayon: entry.rayon,
      famille: entry.famille,
      gb_produits: entry.gbProducts.join('\n').trim() || null,
      tg_responsable: entry.tgResponsables.join(' / ').trim() || null,
      tg_produit: entry.tgProducts.join('\n').trim() || null,
      tg_quantite: entry.tgQuantites.join(' / ').trim() || null,
      tg_mecanique: entry.tgMecaniques.join(' / ').trim() || null,
    };
  });

  return { plans, entries };
}

function parseBalisageWorkbook(balisagePath) {
  const wb = XLSX.readFile(balisagePath, { cellDates: true, raw: false });
  const monthPattern = /^[A-Z]+_20\d{2}$/;
  const rows = [];

  wb.SheetNames.filter((name) => monthPattern.test(normalizeText(name))).forEach((sheetName) => {
    const sheetRows = workbookRows(wb, sheetName);
    const monthId = normalizeText(sheetName);

    for (let i = 3; i < sheetRows.length; i += 1) {
      const row = sheetRows[i] || [];
      const employeeName = normalizeName(row[0]);
      if (!employeeName) continue;
      const total = parseNumber(row[1]);
      const tauxErreur = parseNumber(row[3]);

      rows.push({
        mois: monthId,
        employee_name: employeeName,
        total_controles: total || 0,
        taux_erreur: tauxErreur,
      });
    }
  });

  return rows;
}

function chunkArray(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

async function upsertChunks(supabase, table, rows, onConflict, chunkSize = 500) {
  if (!rows.length) return;
  const chunks = chunkArray(rows, chunkSize);
  for (const chunk of chunks) {
    const query = supabase.from(table).upsert(chunk, onConflict ? { onConflict } : undefined);
    const { error } = await query;
    if (error) {
      throw new Error(`Upsert ${table} failed: ${error.message}`);
    }
  }
}

async function insertChunks(supabase, table, rows, chunkSize = 500) {
  if (!rows.length) return;
  const chunks = chunkArray(rows, chunkSize);
  for (const chunk of chunks) {
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw new Error(`Insert ${table} failed: ${error.message}`);
    }
  }
}

async function deleteByInChunks(supabase, table, column, values, chunkSize = 200) {
  if (!values.length) return;
  const uniqueValues = Array.from(new Set(values));
  const chunks = chunkArray(uniqueValues, chunkSize);
  for (const chunk of chunks) {
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) {
      throw new Error(`Delete ${table} failed: ${error.message}`);
    }
  }
}

async function deletePlanningRange(supabase, rows) {
  if (!rows.length) return;
  const dates = rows.map((row) => row.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const employeeIds = Array.from(new Set(rows.map((row) => row.employee_id)));
  const chunks = chunkArray(employeeIds, 200);
  for (const ids of chunks) {
    const { error } = await supabase
      .from('planning_entries')
      .delete()
      .in('employee_id', ids)
      .gte('date', minDate)
      .lte('date', maxDate);
    if (error) {
      throw new Error(`Delete planning_entries failed: ${error.message}`);
    }
  }
}

async function deleteAbsencesRange(supabase, rows) {
  if (!rows.length) return;
  const starts = rows.map((row) => row.date_debut).filter(Boolean).sort();
  const ends = rows.map((row) => row.date_fin).filter(Boolean).sort();
  if (!starts.length || !ends.length) return;
  const minDate = starts[0];
  const maxDate = ends[ends.length - 1];

  const { error } = await supabase
    .from('absences')
    .delete()
    .gte('date_debut', minDate)
    .lte('date_fin', maxDate);
  if (error) {
    throw new Error(`Delete absences failed: ${error.message}`);
  }
}

function buildSupabaseClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant.');
  }

  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole) {
    return {
      client: createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } }),
      mode: 'service-role',
    };
  }

  return {
    client: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    mode: 'anon',
  };
}

async function maybeSignInManager(supabase, env) {
  const email = env.SUPABASE_MANAGER_EMAIL;
  const password = env.SUPABASE_MANAGER_PASSWORD;
  if (!email || !password) return false;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Connexion manager Supabase impossible: ${error.message}`);
  }
  return true;
}

async function loadEmployeeIdMap(supabase) {
  const { data, error } = await supabase.from('employees').select('id,name').limit(5000);
  if (error) {
    throw new Error(`Lecture employees impossible: ${error.message}`);
  }
  const map = new Map();
  (data || []).forEach((row) => {
    map.set(normalizeName(row.name), row.id);
  });
  return map;
}

async function syncEmployees(supabase, employees) {
  try {
    await upsertChunks(supabase, 'employees', employees, 'name');
    return;
  } catch (err) {
    if (!String(err.message || '').includes('no unique or exclusion constraint')) {
      throw err;
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('employees')
    .select('id,name')
    .limit(5000);
  if (existingError) {
    throw new Error(`Lecture employees impossible: ${existingError.message}`);
  }

  const existingByName = new Map();
  (existingRows || []).forEach((row) => {
    existingByName.set(normalizeName(row.name), row.id);
  });

  const toInsert = [];
  for (const employee of employees) {
    const key = normalizeName(employee.name);
    const existingId = existingByName.get(key);
    if (!existingId) {
      toInsert.push(employee);
      continue;
    }
    const { error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', existingId);
    if (error) {
      throw new Error(`Update employees failed: ${error.message}`);
    }
  }

  await insertChunks(supabase, 'employees', toInsert, 200);
}

function mapNameToIdRows(rows, employeeMap, keys) {
  const unresolved = new Set();
  const out = [];

  rows.forEach((row) => {
    const next = { ...row };
    let valid = true;

    keys.forEach((key) => {
      const sourceName = normalizeName(next[key]);
      let id = employeeMap.get(sourceName);
      if (!id && sourceName === 'HASSANE') {
        id = employeeMap.get('EL HASSANE');
      }
      if (!id) {
        unresolved.add(sourceName);
        valid = false;
        return;
      }
      const idKey = key.replace('_name', '_id');
      next[idKey] = id;
      delete next[key];
    });

    if (valid) out.push(next);
  });

  return { rows: out, unresolved: Array.from(unresolved).sort() };
}

async function main() {
  const args = parseArgs(process.argv);
  requireFile(args.planning, 'planning');
  requireFile(args.tg, 'plan tg');
  requireFile(args.balisage, 'balisage');

  const planning = parsePlanningWorkbook(args.planning);
  const tg = parseTgWorkbook(args.tg);
  const balisage = parseBalisageWorkbook(args.balisage);

  console.log('[parse] employees=', planning.employees.length);
  console.log('[parse] cycle_repos=', planning.cycleRepos.length);
  console.log('[parse] binomes_repos=', planning.binomesRepos.length);
  console.log('[parse] tri_caddie=', planning.triCaddie.length);
  console.log('[parse] planning_entries=', planning.planningEntries.length);
  console.log('[parse] plans_tg=', tg.plans.length);
  console.log('[parse] plans_tg_entries=', tg.entries.length);
  console.log('[parse] balisage_mensuel=', balisage.length);

  if (args.dryRun) {
    console.log('[dry-run] Aucun ecriture Supabase effectuee.');
    return;
  }

  const env = getEnv();
  const { client: supabase, mode } = buildSupabaseClient(env);
  console.log(`[auth] mode=${mode}`);

  if (mode === 'anon') {
    const connected = await maybeSignInManager(supabase, env);
    if (!connected) {
      throw new Error('Ecriture bloquee: ajoute SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_MANAGER_EMAIL/SUPABASE_MANAGER_PASSWORD.');
    }
    console.log('[auth] connecte en manager');
  }

  await syncEmployees(supabase, planning.employees);
  const employeeMap = await loadEmployeeIdMap(supabase);

  const mappedCycle = mapNameToIdRows(planning.cycleRepos, employeeMap, ['employee_name']);
  const mappedBinomes = mapNameToIdRows(planning.binomesRepos, employeeMap, ['employee1_name', 'employee2_name']);
  const mappedTri = mapNameToIdRows(planning.triCaddie, employeeMap, ['employee1_name', 'employee2_name']);
  const mappedPlanning = mapNameToIdRows(planning.planningEntries, employeeMap, ['employee_name']);
  const mappedBalisage = mapNameToIdRows(balisage, employeeMap, ['employee_name']);

  if (mappedCycle.unresolved.length) console.warn('[warn] cycle_repos unresolved employees:', mappedCycle.unresolved.join(', '));
  if (mappedBinomes.unresolved.length) console.warn('[warn] binomes_repos unresolved employees:', mappedBinomes.unresolved.join(', '));
  if (mappedTri.unresolved.length) console.warn('[warn] tri_caddie unresolved employees:', mappedTri.unresolved.join(', '));
  if (mappedPlanning.unresolved.length) console.warn('[warn] planning_entries unresolved employees:', mappedPlanning.unresolved.join(', '));
  if (mappedBalisage.unresolved.length) console.warn('[warn] balisage_mensuel unresolved employees:', mappedBalisage.unresolved.join(', '));

  const planningRows = mappedPlanning.rows.map((row) => ({
    date: row.date,
    employee_id: row.employee_id,
    statut: row.statut,
    horaire_custom: row.horaire_custom,
  }));
  await deletePlanningRange(supabase, planningRows);
  await insertChunks(supabase, 'planning_entries', planningRows, 500);

  const cycleRows = mappedCycle.rows.map((row) => ({
    employee_id: row.employee_id,
    semaine_cycle: row.semaine_cycle,
    jour_repos: row.jour_repos,
  }));
  await deleteByInChunks(supabase, 'cycle_repos', 'employee_id', cycleRows.map((row) => row.employee_id));
  await insertChunks(supabase, 'cycle_repos', cycleRows, 500);

  const binomeRows = mappedBinomes.rows.map((row) => ({
    mois: row.mois,
    binome_number: row.binome_number,
    employee1_id: row.employee1_id,
    employee2_id: row.employee2_id,
  }));
  await deleteByInChunks(supabase, 'binomes_repos', 'mois', binomeRows.map((row) => row.mois));
  await insertChunks(supabase, 'binomes_repos', binomeRows, 200);

  const triRows = mappedTri.rows.map((row) => ({
    mois: row.mois,
    jour_semaine: row.jour_semaine,
    employee1_id: row.employee1_id,
    employee2_id: row.employee2_id,
  }));
  await deleteByInChunks(supabase, 'tri_caddie', 'mois', triRows.map((row) => row.mois));
  await insertChunks(supabase, 'tri_caddie', triRows, 200);

  const planLabels = tg.plans.map((row) => row.label);
  const { data: existingPlans, error: existingPlansError } = await supabase
    .from('plans_tg')
    .select('id,label')
    .in('label', planLabels);
  if (existingPlansError) {
    throw new Error(`Lecture plans_tg impossible: ${existingPlansError.message}`);
  }
  const existingPlanIds = (existingPlans || []).map((row) => row.id);
  if (existingPlanIds.length) {
    await deleteByInChunks(supabase, 'plans_tg_entries', 'plan_id', existingPlanIds, 200);
    await deleteByInChunks(supabase, 'plans_tg', 'id', existingPlanIds, 200);
  }
  await insertChunks(
    supabase,
    'plans_tg',
    tg.plans.map((row) => ({
      label: row.label,
      semaine_de: row.semaine_de,
      semaine_a: row.semaine_a,
      date_de: row.date_de,
      date_a: row.date_a,
    })),
    200,
  );

  const { data: plansData, error: plansError } = await supabase.from('plans_tg').select('id,label').limit(5000);
  if (plansError) {
    throw new Error(`Lecture plans_tg impossible: ${plansError.message}`);
  }
  const planIdByLabel = new Map((plansData || []).map((p) => [p.label, p.id]));

  const tgEntries = tg.entries
    .map((row) => ({ ...row, plan_id: planIdByLabel.get(row.plan_label) || null }))
    .filter((row) => row.plan_id)
    .map((row) => ({
      plan_id: row.plan_id,
      rayon: row.rayon,
      famille: row.famille,
      gb_produits: row.gb_produits,
      tg_responsable: row.tg_responsable,
      tg_produit: row.tg_produit,
      tg_quantite: row.tg_quantite,
      tg_mecanique: row.tg_mecanique,
    }));

  await insertChunks(supabase, 'plans_tg_entries', tgEntries, 500);

  const balisageRows = mappedBalisage.rows.map((row) => ({
    mois: row.mois,
    employee_id: row.employee_id,
    total_controles: row.total_controles,
    taux_erreur: row.taux_erreur,
  }));
  await deleteByInChunks(supabase, 'balisage_mensuel', 'mois', balisageRows.map((row) => row.mois));
  await insertChunks(supabase, 'balisage_mensuel', balisageRows, 500);

  const absencesRows = planning.absences.map((row) => {
    const normalizedName = normalizeName(row.employee_name);
    let employeeId = employeeMap.get(normalizedName) || null;
    if (!employeeId && normalizedName === 'HASSANE') {
      employeeId = employeeMap.get('EL HASSANE') || null;
    }

    let note = row.note;
    if (!employeeId && normalizedName) {
      // Preserve special/global lines like TOUS when employee_id is null.
      note = `EMPLOYEE:${normalizedName}${note ? ` | ${note}` : ''}`;
    }

    return {
      employee_id: employeeId,
      type: row.type,
      date_debut: row.date_debut,
      date_fin: row.date_fin,
      statut: row.statut,
      note: note || null,
    };
  });

  if (absencesRows.length) {
    try {
      await deleteAbsencesRange(supabase, absencesRows);
      await insertChunks(supabase, 'absences', absencesRows, 500);
    } catch (err) {
      console.warn('[warn] import absences ignore:', err.message);
    }
  }

  console.log('[ok] Import termine avec succes.');
}

main().catch((err) => {
  console.error('[error]', err.message);
  process.exitCode = 1;
});
