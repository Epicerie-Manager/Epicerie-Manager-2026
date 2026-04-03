import BalisagePrintPageClient from "@/components/exports/BalisagePrintPageClient";
import { balisageMonths } from "@/lib/balisage-data";

type PageProps = {
  searchParams: Promise<{
    monthId?: string | string[];
  }>;
};

function getSafeMonthId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "AVRIL_2026";
  return balisageMonths.some((month) => month.id === raw) ? raw : "AVRIL_2026";
}

export default async function ExportsBalisagePrintPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const monthId = getSafeMonthId(params.monthId);
  return <BalisagePrintPageClient monthId={monthId} />;
}

