import type { Metadata, Viewport } from "next";
import packageJson from "../../../package.json";
import { ManagerMobileShell } from "@/components/manager/mobile-shell";

export const metadata: Metadata = {
  title: "Manager 2026",
  description: "Application manager mobile",
  icons: {
    icon: "/icons/app-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Manager 2026",
  },
};

export const viewport: Viewport = {
  themeColor: "#9f1239",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ManagerMobileShell version={packageJson.version}>{children}</ManagerMobileShell>;
}
