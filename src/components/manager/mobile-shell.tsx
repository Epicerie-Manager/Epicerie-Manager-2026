"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  clearBrowserSessionState,
} from "@/lib/browser-session";
import { loadManagerDisplayName } from "@/lib/followup-store";
import { createClient } from "@/lib/supabase";

type ManagerMobileShellProps = {
  version: string;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const iconStyle = {
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const navItems: NavItem[] = [
  {
    label: "Accueil",
    href: "/manager",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    label: "Terrain",
    href: "/manager/terrain",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M12 20l9-5-9-5-9 5 9 5z" />
        <path d="M21 9l-9-5-9 5" />
        <path d="M3 15l9 5 9-5" />
      </svg>
    ),
  },
  {
    label: "Planning",
    href: "/manager/planning",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Balisage",
    href: "/manager/balisage",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 12.5l2.5 2.5L16.5 9" />
      </svg>
    ),
  },
  {
    label: "Suivi",
    href: "/manager/suivi",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M8 18l4-4 3 3 5-7" />
        <path d="M4 4v16h16" />
      </svg>
    ),
  },
  {
    label: "Absences",
    href: "/manager/absences",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    label: "Infos",
    href: "/manager/infos",
    icon: (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6" />
        <path d="M12 7h.01" />
      </svg>
    ),
  },
];

function getSectionTitle(pathname: string) {
  if (pathname.startsWith("/manager/terrain")) return "Saisie terrain";
  if (pathname.startsWith("/manager/planning")) return "Planning manager";
  if (pathname.startsWith("/manager/balisage")) return "Balisage manager";
  if (pathname.startsWith("/manager/suivi")) return "Suivi collaborateur";
  if (pathname.startsWith("/manager/absences")) return "Absences manager";
  if (pathname.startsWith("/manager/infos")) return "Infos manager";
  return "Accueil manager";
}

function getManagerFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

function formatManagerHeaderDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function ManagerMobileShell({ version, children }: ManagerMobileShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isManagerAuthRoute =
    pathname.startsWith("/manager/login") ||
    pathname.startsWith("/manager/pin") ||
    pathname.startsWith("/manager/auth");
  const sectionTitle = getSectionTitle(pathname);
  const [managerName, setManagerName] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const signingOutRef = useRef(false);
  const managerFirstName = getManagerFirstName(managerName);
  const headerDate = formatManagerHeaderDate(new Date());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(orientation: landscape)");
    const syncLandscape = () => {
      setIsLandscape(media.matches);
      setViewportWidth(window.innerWidth);
    };

    syncLandscape();
    media.addEventListener("change", syncLandscape);
    window.addEventListener("resize", syncLandscape);

    return () => {
      media.removeEventListener("change", syncLandscape);
      window.removeEventListener("resize", syncLandscape);
    };
  }, []);

  const isWideLandscape = isLandscape && viewportWidth >= 700;

  useEffect(() => {
    if (isManagerAuthRoute) return;
    let cancelled = false;

    const guardManagerSession = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/manager/login");
        return;
      }
      const name = await loadManagerDisplayName().catch(() => "");
      if (!cancelled) setManagerName(name);
    };

    void guardManagerSession();

    return () => {
      cancelled = true;
    };
  }, [isManagerAuthRoute, router]);

  useEffect(() => {
    if (isManagerAuthRoute) return;
    return;
  }, [isManagerAuthRoute, router]);

  const handleSignOut = async () => {
    if (signingOutRef.current || isSigningOut) return;
    signingOutRef.current = true;
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      clearBrowserSessionState();
      await supabase.auth.signOut();
      router.replace("/manager/login");
      router.refresh();
    } finally {
      signingOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  if (isManagerAuthRoute) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(185,28,46,0.16) 0%, transparent 28%), " +
            "radial-gradient(circle at bottom right, rgba(14,116,144,0.12) 0%, transparent 30%), " +
            "linear-gradient(180deg, #f8f3ee 0%, #f4efe9 48%, #eee7df 100%)",
          fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            width: isWideLandscape ? "min(100%, 860px)" : "min(100%, 520px)",
            margin: "0 auto",
            minHeight: "100vh",
            padding: "18px 16px 32px",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(185,28,46,0.16) 0%, transparent 28%), " +
          "radial-gradient(circle at bottom right, rgba(14,116,144,0.12) 0%, transparent 30%), " +
          "linear-gradient(180deg, #f8f3ee 0%, #f4efe9 48%, #eee7df 100%)",
        fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          width: isWideLandscape ? "min(100%, 1120px)" : "min(100%, 520px)",
          margin: "0 auto",
          minHeight: "100vh",
          padding: isWideLandscape ? "18px 20px 84px" : "18px 16px 108px",
          position: "relative",
        }}
      >
        <header
          style={{
            paddingTop: 6,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: "10px 14px 12px",
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.75)",
              boxShadow: "0 10px 30px rgba(80,45,20,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#9f1239",
                  }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #be123c, #fb7185)",
                      boxShadow: "0 0 0 4px rgba(190,24,93,0.12)",
                    }}
                    />
                  Manager 2026
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>
                  {pathname === "/manager" && managerFirstName ? `Bonjour ${managerFirstName}` : sectionTitle}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280", textTransform: "capitalize" }}>
                  {headerDate}
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      letterSpacing: "0.03em",
                    }}
                  >
                    v{version}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#15803d",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#22c55e",
                        boxShadow: "0 0 0 3px rgba(34,197,94,0.12)",
                      }}
                    />
                    Connecté
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    style={{
                      borderRadius: 999,
                      padding: "5px 10px",
                      background: "rgba(254,242,242,0.96)",
                      border: "1px solid rgba(248,113,113,0.28)",
                      color: "#991b1b",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: isSigningOut ? "not-allowed" : "pointer",
                      opacity: isSigningOut ? 0.7 : 1,
                    }}
                  >
                    {isSigningOut ? "Déconnexion..." : "Déconnexion"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      <nav
        aria-label="Navigation application manager"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 12,
          transform: "translateX(-50%)",
          width: isWideLandscape ? "min(calc(100% - 28px), 560px)" : "min(calc(100% - 18px), 500px)",
          zIndex: 30,
        }}
      >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 6,
              padding: isWideLandscape ? "7px" : "10px",
              borderRadius: 26,
            background: isWideLandscape ? "rgba(17,24,39,0.76)" : "rgba(17,24,39,0.92)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: "0 12px 36px rgba(15,23,42,0.24)",
          }}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/manager"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: isWideLandscape ? 3 : 6,
                  padding: isWideLandscape ? "7px 4px" : "10px 4px",
                  borderRadius: 18,
                  textDecoration: "none",
                  color: active ? "#ffffff" : "rgba(226,232,240,0.78)",
                  background: active ? "linear-gradient(135deg, rgba(190,24,93,0.95), rgba(239,68,68,0.9))" : "transparent",
                }}
              >
                <span style={{ display: "inline-flex" }}>{item.icon}</span>
                <span style={{ fontSize: isWideLandscape ? 8.5 : 10, fontWeight: 700, letterSpacing: "-0.01em" }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
