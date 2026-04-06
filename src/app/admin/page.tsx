import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminPageClient, type AdminJournalEntry } from "./admin-page-client";

type ChangelogSection = {
  version: string;
  date: string;
  items: string[];
};

function parseChangelogSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const matches = Array.from(normalized.matchAll(/^## (v[^\n]+?) - ([0-9]{4}-[0-9]{2}-[0-9]{2}|a confirmer)$/gm));
  const sections: ChangelogSection[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const start = current.index ?? 0;
    const end = matches[index + 1]?.index ?? normalized.length;
    const block = normalized.slice(start, end);
    const items = block
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2).trim())
      .filter(Boolean);

    sections.push({
      version: current[1],
      date: current[2],
      items,
    });
  }

  return sections;
}

async function loadAdminJournalEntries(): Promise<AdminJournalEntry[]> {
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    const raw = await fs.readFile(changelogPath, "utf8");
    return parseChangelogSections(raw)
      .slice(0, 6)
      .map((entry) => ({
        version: entry.version,
        date: entry.date,
        items: entry.items.slice(0, 4),
      }));
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const journalEntries = await loadAdminJournalEntries();

  return <AdminPageClient initialJournal={journalEntries} />;
}
