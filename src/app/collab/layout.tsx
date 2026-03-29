import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Épicerie Villebon 2",
  description: "Espace collaborateur",
  manifest: "/manifest.json",
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
        background: "#faf8f5",
        fontFamily: "Georgia, serif",
        maxWidth: "430px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
