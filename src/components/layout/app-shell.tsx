"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PlanRayonConfirmModal } from "@/components/plan-rayon/confirm-modal";
import {
  attachBrowserSessionResponder,
  broadcastForceSignOut,
  clearBrowserSessionState,
  createBrowserSessionChannel,
  getLastBrowserActivityAt,
  INACTIVITY_CHECK_INTERVAL_MS,
  INACTIVITY_TIMEOUT_MS,
  markBrowserSessionActive,
  recordBrowserActivity,
  restoreBrowserSessionMarker,
} from "@/lib/browser-session";
import { isAdminUser } from "@/lib/admin-access";
import { canAccessOfficePath, getOfficeModuleAccess } from "@/lib/office-access";
import type { ModuleAccessKey } from "@/lib/modules-config";
import { loadCurrentOfficeProfile } from "@/lib/office-profile";
import { ensureSessionLog, endSessionLog, heartbeatSessionLog } from "@/lib/session-log-client";
import { colors, getThemeByPathname, moduleThemes, shadows } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

type AppShellProps = {
  version: string;
  children: React.ReactNode;
};

type ModuleNavItem = {
  id: "dashboard" | "planning" | "exports" | "plantg" | "planriz" | "plateau" | "balisage" | "ruptures" | "absences" | "infos" | "aide" | "admin" | "rh" | "suivi";
  label: string;
  desc: string;
  href: string;
};

const moduleItems: ModuleNavItem[] = [
  { id: "dashboard", label: "Dashboard",  desc: "Vue d'ensemble",        href: "/" },
  { id: "planning",  label: "Planning",   desc: "Horaires et présences", href: "/planning" },
  { id: "exports",   label: "Exports",    desc: "Impressions & planning", href: "/exports" },
  { id: "plantg",    label: "Plan TG",    desc: "Têtes de gondole",      href: "/plan-tg" },
  { id: "planriz",   label: "Plan de rayon",desc: "Réimplantations & rayons", href: "/plan-de-rayon" },
  { id: "plateau",   label: "Plateaux",   desc: "Implantations terrain", href: "/plan-plateau" },
  { id: "balisage",  label: "Balisage",   desc: "Contrôle étiquetage",   href: "/stats" },
  { id: "ruptures",  label: "Ruptures",   desc: "Suivi des ruptures",    href: "/ruptures" },
  { id: "absences",  label: "Absences",   desc: "Demandes et validation",href: "/absences" },
  { id: "rh",        label: "RH",         desc: "Fiches employés",        href: "/rh" },
  { id: "suivi",     label: "Suivi",      desc: "Suivi collaborateur",    href: "/suivi" },
  { id: "infos",     label: "Infos",      desc: "Base documentaire",     href: "/infos" },
  { id: "aide",      label: "Aide",       desc: "Tutoriels & démos",     href: "/aide" },
  { id: "admin",     label: "Admin",      desc: "Messages & maintenance",href: "/admin" },
];
const MASS_PLAN_DIRTY_STORAGE_KEY = "plan-rayon-mass-plan-dirty";

const iconStyle = {
  width: "15px",
  height: "15px",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" />
      <rect x="14" y="3"  width="7" height="7" rx="1.5" />
      <rect x="3"  y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  planning: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  ),
  exports: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  plantg: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  planriz: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M3 6h18" />
      <path d="M6 3v6" />
      <path d="M18 3v6" />
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  ),
  plateau: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8"  y1="2"  x2="8"  y2="18" />
      <line x1="16" y1="6"  x2="16" y2="22" />
    </svg>
  ),
  balisage: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  ruptures: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M12 3v10" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 21h14" />
      <path d="M7 17h10" />
    </svg>
  ),
  absences: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  infos: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12"    y2="12" />
      <line x1="12" y1="8"  x2="12.01" y2="8"  />
    </svg>
  ),
  aide: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M12 2l7 4v6c0 5-3.2 9.3-7 10-3.8-.7-7-5-7-10V6l7-4z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  ),
  rh: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  suivi: (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

function getTodayLabel() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTimeLabel() {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppShell({ version, children }: AppShellProps) {
  const pathname  = usePathname();
  const router = useRouter();
  const isCollabRoute = pathname.startsWith("/collab");
  const isManagerRoute = pathname.startsWith("/manager");
  const isPrintRoute = pathname.startsWith("/exports/") && pathname.endsWith("/print");
  const activeId  = getThemeByPathname(pathname) as ModuleNavItem["id"];
  const isAdminRoute = activeId === "admin";
  const activeModule = moduleItems.find((m) => m.id === activeId) ?? moduleItems[0];
  const shellMaxWidth = activeId === "planning" ? "min(2040px, calc(100vw - 12px))" : isAdminRoute ? "calc(100vw - 24px)" : "1580px";
  const shellPaddingX = activeId === "planning" ? "0 12px" : isAdminRoute ? "0 12px" : "0 20px";
  const shellMainPadding = activeId === "planning" ? "0 12px 32px" : isAdminRoute ? "0 12px 12px" : "0 20px 32px";
  const [todayLabel, setTodayLabel] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userLabel, setUserLabel] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [officeRole, setOfficeRole] = useState("");
  const [allowedModules, setAllowedModules] = useState<ModuleAccessKey[]>([]);
  const [officeAccessResolved, setOfficeAccessResolved] = useState(false);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const signingOutRef = useRef(false);
  const modulesMenuRef = useRef<HTMLDivElement | null>(null);
  const sessionLogBootstrappedRef = useRef(false);

  useEffect(() => {
    if (isCollabRoute || isPrintRoute || isManagerRoute) return;
    const refreshClock = () => {
      setTodayLabel(getTodayLabel());
      setTimeLabel(getTimeLabel());
    };

    refreshClock();
    const timer = window.setInterval(refreshClock, 1000);
    return () => window.clearInterval(timer);
  }, [isCollabRoute, isManagerRoute, isPrintRoute]);

  useEffect(() => {
    if (pathname === "/login" || isCollabRoute || isPrintRoute || isManagerRoute) return;
    const guardPasswordFlow = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setOfficeAccessResolved(true);
        router.replace("/login");
        return;
      }
      const restored = await restoreBrowserSessionMarker();
      if (!restored) {
        clearBrowserSessionState();
        await supabase.auth.signOut();
        setOfficeAccessResolved(true);
        router.replace("/login");
        router.refresh();
        return;
      }
      markBrowserSessionActive();
      recordBrowserActivity();

      const profile = await loadCurrentOfficeProfile(supabase);
      const resolvedRole = String(profile?.role ?? "");
      const resolvedAdmin = isAdminUser(user.email ?? null, resolvedRole);
      setUserLabel(profile?.full_name?.trim() || user.email || "");
      setIsAdmin(resolvedAdmin);
      setOfficeRole(resolvedRole);
      setAllowedModules(profile?.allowed_modules ?? []);

      const allowedOfficeModules = getOfficeModuleAccess(resolvedRole, profile?.allowed_modules ?? [], resolvedAdmin);
      if (!allowedOfficeModules.size) {
        clearBrowserSessionState();
        await supabase.auth.signOut();
        setOfficeAccessResolved(true);
        router.replace("/login");
        router.refresh();
        return;
      }

      const passwordChanged = profile?.password_changed === true;
      if (!passwordChanged && pathname !== "/change-password") {
        router.replace("/change-password");
        return;
      }
      if (!canAccessOfficePath(pathname, resolvedRole, profile?.allowed_modules ?? [], resolvedAdmin)) {
        setOfficeAccessResolved(true);
        router.replace("/");
        return;
      }
      if (passwordChanged && pathname === "/change-password") {
        router.replace("/");
      }
      setOfficeAccessResolved(true);
    };
    void guardPasswordFlow();
  }, [isCollabRoute, isManagerRoute, isPrintRoute, pathname, router]);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/change-password" || isCollabRoute || isPrintRoute || isManagerRoute) return;

    const supabase = createClient();
    const channel = createBrowserSessionChannel();
    const signOutNow = async () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      setIsSigningOut(true);
      try {
        await endSessionLog("bureau", activeModule.label);
        clearBrowserSessionState();
        broadcastForceSignOut(channel);
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      } finally {
        setIsSigningOut(false);
        signingOutRef.current = false;
      }
    };

    markBrowserSessionActive();
    recordBrowserActivity();

    const detachResponder = channel
      ? attachBrowserSessionResponder(channel, () => {
          void signOutNow();
        })
      : null;

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "focus",
    ];
    const handleActivity = () => {
      recordBrowserActivity();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const interval = window.setInterval(() => {
      const lastActivityAt = getLastBrowserActivityAt();
      if (!lastActivityAt) {
        recordBrowserActivity();
        return;
      }
      if (Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
        void signOutNow();
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      detachResponder?.();
      channel?.close();
    };
  }, [isCollabRoute, isManagerRoute, isPrintRoute, pathname, router]);

  useEffect(() => {
    setIsModulesMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (
      !officeAccessResolved ||
      pathname === "/login" ||
      pathname === "/change-password" ||
      isCollabRoute ||
      isPrintRoute ||
      isManagerRoute
    ) {
      return;
    }

    const syncSession = async () => {
      try {
        if (!sessionLogBootstrappedRef.current) {
          sessionLogBootstrappedRef.current = true;
          await ensureSessionLog("bureau", activeModule.label);
          return;
        }
        await heartbeatSessionLog("bureau", activeModule.label);
      } catch {
        // Le logging ne doit jamais bloquer le shell bureau.
      }
    };

    void syncSession();
  }, [activeModule.label, isCollabRoute, isManagerRoute, isPrintRoute, officeAccessResolved, pathname]);

  useEffect(() => {
    if (
      !officeAccessResolved ||
      pathname === "/login" ||
      pathname === "/change-password" ||
      isCollabRoute ||
      isPrintRoute ||
      isManagerRoute
    ) {
      return;
    }

    const syncHeartbeat = () => {
      void heartbeatSessionLog("bureau", activeModule.label).catch(() => {
        // Le dashboard admin peut rester vide quelques secondes, mais l'UX ne doit pas casser.
      });
    };

    const interval = window.setInterval(syncHeartbeat, 60_000);
    const handleFocus = () => syncHeartbeat();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncHeartbeat();
      }
    };
    const handleBeforeUnload = () => {
      void endSessionLog("bureau", activeModule.label, true);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeModule.label, isCollabRoute, isManagerRoute, isPrintRoute, officeAccessResolved, pathname]);

  useEffect(() => {
    if (!isModulesMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!modulesMenuRef.current?.contains(event.target as Node)) {
        setIsModulesMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isModulesMenuOpen]);

  const handleSignOut = async () => {
    if (isSigningOut || signingOutRef.current) return;
    signingOutRef.current = true;
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await endSessionLog("bureau", activeModule.label);
      clearBrowserSessionState();
      setIsAdmin(false);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
      signingOutRef.current = false;
    }
  };

  const hasUnsavedMassPlanChanges =
    pathname === "/plan-de-rayon" &&
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(MASS_PLAN_DIRTY_STORAGE_KEY) === "1";

  const handleProtectedNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!hasUnsavedMassPlanChanges || href === pathname) return;
    event.preventDefault();
    setPendingNavigationHref(href);
    setIsModulesMenuOpen(false);
  };

  const confirmProtectedNavigation = () => {
    if (!pendingNavigationHref) return;
    window.sessionStorage.setItem(MASS_PLAN_DIRTY_STORAGE_KEY, "0");
    window.dispatchEvent(new CustomEvent("plan-rayon:mass-plan-dirty", { detail: { dirty: false } }));
    const href = pendingNavigationHref;
    setPendingNavigationHref(null);
    router.push(href);
  };

  if (
    pathname === "/login" ||
    pathname === "/change-password" ||
    isCollabRoute ||
    isPrintRoute ||
    isManagerRoute
  ) {
    return <>{children}</>;
  }

  const allowedModuleIds = officeAccessResolved
    ? getOfficeModuleAccess(officeRole, allowedModules, isAdmin)
    : new Set<ModuleNavItem["id"]>(["dashboard"]);
  const visibleModuleItems = moduleItems.filter((item) => allowedModuleIds.has(item.id));
  const dashboardItem = visibleModuleItems.find((item) => item.id === "dashboard") ?? moduleItems[0];
  const activeNavItem = visibleModuleItems.find((item) => item.id === activeId) ?? activeModule;
  const menuModuleItems = visibleModuleItems.filter((item) => item.id !== "dashboard" && item.id !== activeNavItem.id);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          isAdminRoute
            ? "#0d1117"
            : "radial-gradient(circle at 15% 10%, rgba(10,79,152,0.07) 0%, transparent 30%), " +
              "radial-gradient(circle at 85% 80%, rgba(185,28,46,0.04) 0%, transparent 30%), " +
              "linear-gradient(180deg, #f6f9fc 0%, #eef2f7 100%)",
        color: isAdminRoute ? "#c9d1d9" : colors.text,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── HEADER ─────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: isAdminRoute ? "rgba(13,17,23,0.96)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: isAdminRoute ? "1px solid #21262d" : "1px solid rgba(210,222,234,0.6)",
          boxShadow: isAdminRoute ? "none" : shadows.subtle,
        }}
      >
        <div
          style={{
            maxWidth: shellMaxWidth,
            margin: "0 auto",
            padding: shellPaddingX,
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {/* Logo + titre */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #b91c2e, #8f1222)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 2px 8px rgba(185,28,46,0.28)",
              }}
            >
              {ICONS["dashboard"]}
            </div>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isAdminRoute ? "#8b949e" : colors.muted,
                  lineHeight: 1,
                }}
              >
                Épicerie Villebon 2
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: isAdminRoute ? "#c9d1d9" : colors.textStrong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {activeModule.label}
              </div>
              <div
                style={{
                  marginTop: "2px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: isAdminRoute ? "#6e7681" : "#94a3b8",
                  lineHeight: 1.1,
                }}
              >
                v{version}
              </div>
            </div>
          </div>

          {/* Nav pills */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              minWidth: 0,
            }}
            aria-label="Navigation modules"
          >
            <Link
              href={dashboardItem.href}
              onClick={(event) => handleProtectedNavigation(event, dashboardItem.href)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "999px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontWeight: dashboardItem.id === activeId ? 700 : 600,
                background: dashboardItem.id === activeId ? moduleThemes[dashboardItem.id].medium : isAdminRoute ? "#161b22" : "#ffffff",
                color: dashboardItem.id === activeId ? moduleThemes[dashboardItem.id].color : isAdminRoute ? "#c9d1d9" : colors.textStrong,
                border: isAdminRoute ? "1px solid #30363d" : "1px solid #dbe3eb",
                boxShadow: dashboardItem.id === activeId || isAdminRoute ? "none" : "0 1px 2px rgba(15,23,42,0.04)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: "15px",
                  height: "15px",
                  color: dashboardItem.id === activeId ? moduleThemes[dashboardItem.id].color : isAdminRoute ? "#8b949e" : colors.muted,
                }}
              >
                {ICONS[dashboardItem.id]}
              </span>
              {dashboardItem.label}
            </Link>

            {activeNavItem.id !== "dashboard" ? (
              <Link
                href={activeNavItem.href}
                onClick={(event) => handleProtectedNavigation(event, activeNavItem.href)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: moduleThemes[activeNavItem.id].medium,
                  color: moduleThemes[activeNavItem.id].color,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: "15px",
                    height: "15px",
                    color: moduleThemes[activeNavItem.id].color,
                  }}
                >
                  {ICONS[activeNavItem.id]}
                </span>
                {activeNavItem.label}
              </Link>
            ) : null}

            {menuModuleItems.length ? (
              <div ref={modulesMenuRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setIsModulesMenuOpen((current) => !current)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: "34px",
                    padding: "0 12px",
                    borderRadius: "999px",
                    border: isAdminRoute ? "1px solid #30363d" : "1px solid #dbe3eb",
                    background: isAdminRoute ? "#161b22" : isModulesMenuOpen ? "#eef5ff" : "#ffffff",
                    color: isAdminRoute ? "#c9d1d9" : "#334155",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700,
                    boxShadow: isAdminRoute ? "none" : "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isModulesMenuOpen}
                >
                  Modules
                  <span style={{ fontSize: "11px", color: isAdminRoute ? "#8b949e" : "#64748b" }}>{isModulesMenuOpen ? "▲" : "▼"}</span>
                </button>

                {isModulesMenuOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      left: 0,
                      minWidth: "420px",
                      maxWidth: "560px",
                      padding: "12px",
                      borderRadius: "20px",
                      border: isAdminRoute ? "1px solid #30363d" : "1px solid rgba(210,222,234,0.9)",
                      background: isAdminRoute ? "rgba(13,17,23,0.98)" : "rgba(255,255,255,0.98)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
                      gap: "8px",
                      zIndex: 120,
                    }}
                    role="menu"
                  >
                    {menuModuleItems.map((item) => {
                      const theme = moduleThemes[item.id];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={(event) => handleProtectedNavigation(event, item.href)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px 1fr",
                            alignItems: "start",
                            gap: "10px",
                            padding: "10px 12px",
                            borderRadius: "14px",
                            textDecoration: "none",
                            color: isAdminRoute ? "#c9d1d9" : "#1e293b",
                            background: isAdminRoute ? "#161b22" : "#ffffff",
                            border: isAdminRoute ? "1px solid #21262d" : "1px solid #e2e8f0",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              width: "18px",
                              height: "18px",
                              color: theme.color,
                              marginTop: "1px",
                            }}
                          >
                            {ICONS[item.id]}
                          </span>
                          <span style={{ display: "grid", gap: "2px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800 }}>{item.label}</span>
                            <span style={{ fontSize: "11px", color: isAdminRoute ? "#8b949e" : "#64748b", lineHeight: 1.3 }}>{item.desc}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          {/* Date + version */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: isAdminRoute ? "#8b949e" : colors.muted,
                background: isAdminRoute ? "#161b22" : "#f1f5f9",
                padding: "5px 12px",
                borderRadius: "999px",
                border: isAdminRoute ? "1px solid #30363d" : "1px solid #dbe3eb",
                whiteSpace: "nowrap",
              }}
              suppressHydrationWarning
            >
              {todayLabel || "Date du jour"} {timeLabel ? `• ${timeLabel}` : ""}
            </span>
            {userLabel ? (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: isAdminRoute ? "#c9d1d9" : "#1e293b",
                  background: isAdminRoute ? "#161b22" : "#ffffff",
                  padding: "5px 12px",
                  borderRadius: "999px",
                  border: isAdminRoute ? "1px solid #30363d" : "1px solid #dbe3eb",
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={userLabel}
              >
                {userLabel}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: isAdminRoute ? "#ff8f8a" : "#991b1b",
                background: isAdminRoute ? "rgba(248,81,73,0.12)" : "#fef2f2",
                padding: "5px 12px",
                borderRadius: "999px",
                border: isAdminRoute ? "1px solid #8b1a1a" : "1px solid #fecaca",
                cursor: isSigningOut ? "not-allowed" : "pointer",
                opacity: isSigningOut ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {isSigningOut ? "Déconnexion..." : "Déconnexion"}
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENU ────────────────────────────────── */}
      <main
        style={{
          maxWidth: shellMaxWidth,
          margin: "0 auto",
          padding: shellMainPadding,
        }}
      >
        {children}
      </main>

      <PlanRayonConfirmModal
        open={Boolean(pendingNavigationHref)}
        title="Quitter le plan de masse sans sauvegarder ?"
        description="Le plan de masse contient des modifications non sauvegardées. Si vous changez de module maintenant, elles seront perdues."
        confirmLabel="Quitter sans sauvegarder"
        onClose={() => setPendingNavigationHref(null)}
        onConfirm={confirmProtectedNavigation}
      />
    </div>
  );
}

