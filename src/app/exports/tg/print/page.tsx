import TgPrintPageClient from "@/components/exports/TgPrintPageClient";
import { getCurrentTgWeekId } from "@/components/exports/tg-print-utils";
import { tgWeeks } from "@/lib/tg-data";

type PageProps = {
  searchParams: Promise<{
    weekId?: string | string[];
  }>;
};

function getSafeWeekId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && tgWeeks.some((week) => week.id === raw)) return raw;
  return getCurrentTgWeekId() || tgWeeks[0]?.id || "";
}

export default async function ExportsTgPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const weekId = getSafeWeekId(params.weekId);
  return <TgPrintPageClient weekId={weekId} />;
}
