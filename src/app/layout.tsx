import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
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
  title: "Epicerie Manager 2026",
  description: "Application de pilotage pour l'equipe epicerie",
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
        <div className="app-shell">
          <header className="site-header">
            <div className="brand-block">
              <div className="brand-meta-row">
                <p className="eyebrow">Epicerie Manager 2026</p>
                <span className="version-badge">v{packageJson.version}</span>
              </div>
              <Link href="/" className="brand-link">
                Villebon 2
              </Link>
            </div>
            <SiteNav />
          </header>
          <main className="page-frame">{children}</main>
        </div>
      </body>
    </html>
  );
}
