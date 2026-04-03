import PlanningPrintPageClient from "@/components/exports/PlanningPrintPageClient";
import { type ExportPlanningFormat, getMondayOfWeek } from "@/components/exports/planning-print-utils";
import { formatPlanningDate } from "@/lib/planning-store";

function getSafeFormat(value: string | string[] | undefined): ExportPlanningFormat {
  return value === "1m" ? "1m" : "2s";
}

function getSafeAnchor(value: string | string[] | undefined, format: ExportPlanningFormat) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return format === "1m"
        ? formatPlanningDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
        : raw;
    }
  }
  const now = new Date();
  const fallback = format === "1m" ? new Date(now.getFullYear(), now.getMonth(), 1) : getMondayOfWeek(now);
  return formatPlanningDate(fallback);
}

export default async function ExportsPlanningPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string | string[]; anchor?: string | string[] }>;
}) {
  const params = await searchParams;
  const format = getSafeFormat(params.format);
  const anchor = getSafeAnchor(params.anchor, format);

  return <PlanningPrintPageClient format={format} anchor={anchor} />;
}
