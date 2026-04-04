import { notFound } from "next/navigation";
import { ManagerPinProfileScreen } from "@/components/manager/manager-pin-profile-screen";

type ManagerPinProfilePageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ManagerMobilePinProfilePage({ params }: ManagerPinProfilePageProps) {
  const resolvedParams = await params;
  const profileSlug = String(resolvedParams?.profile ?? "").trim().toLowerCase();

  if (!profileSlug) {
    notFound();
  }

  return <ManagerPinProfileScreen profileSlug={profileSlug} />;
}
