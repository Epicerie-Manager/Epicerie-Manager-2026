import type { Metadata, Viewport } from "next";
import packageJson from "../../../package.json";

export const metadata: Metadata = {
  title: "Épicerie Villebon 2",
  description: "Espace collaborateur",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/app-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Épicerie",
  },
};

export const viewport: Viewport = {
  themeColor: "#D40511",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CollabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0ece6",
        fontFamily: "Georgia, serif",
        maxWidth: "430px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(210,196,182,0.9)",
          color: "#8a6b42",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          zIndex: 40,
          boxShadow: "0 2px 8px rgba(80,50,30,0.10)",
        }}
      >
        v{packageJson.version}
      </div>
    </div>
  );
}
