import { redirect } from "next/navigation";

type ManagerPinProfilePageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ManagerMobilePinProfilePage({ params }: ManagerPinProfilePageProps) {
  await params;
  redirect("/manager/login");
}
