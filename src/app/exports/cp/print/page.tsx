import type { Metadata } from "next";
import CpPrintPageClient from "@/components/exports/CpPrintPageClient";

function getSafeDate(value: string | string[] | undefined, fallback: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return fallback;
}

function getSafeTitle(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || "Planning CP";
}

function getSafeFarida(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ start?: string | string[]; end?: string | string[]; title?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const title = getSafeTitle(params.title);
  return {
    title,
  };
}

export default async function ExportsCpPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string | string[]; end?: string | string[]; title?: string | string[]; farida?: string | string[] }>;
}) {
  const params = await searchParams;
  const startIso = getSafeDate(params.start, "2026-06-01");
  const endIso = getSafeDate(params.end, "2026-10-31");
  const title = getSafeTitle(params.title);
  const faridaLeave = getSafeFarida(params.farida);

  return <CpPrintPageClient title={title} startIso={startIso} endIso={endIso < startIso ? startIso : endIso} faridaSerialized={faridaLeave} />;
}
