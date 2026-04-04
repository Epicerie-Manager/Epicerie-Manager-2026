import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import packageJson from "../../package.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_VARIANT === "manager" ? "Manager 2026" : "Epicerie Manager",
  description:
    process.env.NEXT_PUBLIC_APP_VARIANT === "manager"
      ? "Application manager mobile"
      : "Application de pilotage pour l'equipe epicerie",
  icons: {
    icon:
      process.env.NEXT_PUBLIC_APP_VARIANT === "manager"
        ? "/icons/manager-icon.svg"
        : "/icons/app-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell version={packageJson.version}>{children}</AppShell>
      </body>
    </html>
  );
}
