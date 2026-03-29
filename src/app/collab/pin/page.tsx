import { CollabPinPageClient } from "@/components/collab/pin-page-client";

export default async function CollabPinPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const params = await searchParams;
  return <CollabPinPageClient selectedName={params.name ?? ""} />;
}
