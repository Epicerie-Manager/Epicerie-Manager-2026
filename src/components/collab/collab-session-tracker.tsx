"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getCollabProfile } from "@/lib/collab-auth";
import { ensureSessionLog, endSessionLog, heartbeatSessionLog } from "@/lib/session-log-client";

function getCollabModuleLabel(pathname: string) {
  if (pathname.startsWith("/collab/home")) return "Accueil collab";
  if (pathname.startsWith("/collab/planning")) return "Planning collab";
  if (pathname.startsWith("/collab/absences")) return "Absences collab";
  if (pathname.startsWith("/collab/plan-tg")) return "Plan TG collab";
  if (pathname.startsWith("/collab/plateau")) return "Plateau collab";
  if (pathname.startsWith("/collab/balisage")) return "Balisage collab";
  if (pathname.startsWith("/collab/infos")) return "Infos collab";
  if (pathname.startsWith("/collab/more")) return "Plus collab";
  if (pathname.startsWith("/collab/change-pin")) return "Changement code collab";
  return "Collab";
}

export function CollabSessionTracker() {
  const pathname = usePathname();
  const sessionLogBootstrappedRef = useRef(false);

  useEffect(() => {
    if (
      pathname === "/collab" ||
      pathname.startsWith("/collab/login") ||
      pathname.startsWith("/collab/pin")
    ) {
      return;
    }

    const syncSession = async () => {
      try {
        const profile = await getCollabProfile();
        if (!profile || profile.role !== "collaborateur") return;

        const moduleName = getCollabModuleLabel(pathname);
        if (!sessionLogBootstrappedRef.current) {
          sessionLogBootstrappedRef.current = true;
          await ensureSessionLog("collab", moduleName);
          return;
        }
        await heartbeatSessionLog("collab", moduleName);
      } catch {
        // Le logging collab ne doit jamais gêner l'usage.
      }
    };

    void syncSession();
  }, [pathname]);

  useEffect(() => {
    if (
      pathname === "/collab" ||
      pathname.startsWith("/collab/login") ||
      pathname.startsWith("/collab/pin")
    ) {
      return;
    }

    const moduleName = getCollabModuleLabel(pathname);
    const syncHeartbeat = () => {
      void heartbeatSessionLog("collab", moduleName).catch(() => {
        // noop
      });
    };
    const handleBeforeUnload = () => {
      void endSessionLog("collab", moduleName, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncHeartbeat();
      }
    };

    const interval = window.setInterval(syncHeartbeat, 60_000);
    window.addEventListener("focus", syncHeartbeat);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncHeartbeat);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
