import PlanRayonPrintPageClient from "@/components/exports/PlanRayonPrintPageClient";

function getSafeView(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "calendar" ? "calendar" : "gantt";
}

function getSafeOperationId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? "";
}

export default async function ExportsPlanRayonPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; operationId?: string | string[] }>;
}) {
  const params = await searchParams;
  const documentType = getSafeView(params.view);
  const operationId = getSafeOperationId(params.operationId);

  return <PlanRayonPrintPageClient documentType={documentType} operationId={operationId} />;
}
