import type { Metadata } from "next";
import { DM_Sans, Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
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
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell version={packageJson.version}>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
