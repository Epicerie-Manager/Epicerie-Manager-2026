"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type Props = {
  activeView: string;
  onViewChange: (view: string) => void;
  navItems: Array<{ id: string; label: string; icon: string; badge?: string | null }>;
  modules: Array<{ label: string; score?: number; status: "ok" | "warn" | "err"; meta?: string }>;
  infrastructure: Array<{ label: string; score?: number; status: "ok" | "warn" | "err"; meta?: string }>;
  children: ReactNode;
};

export function AdminShell({ activeView, onViewChange, navItems, modules, infrastructure, children }: Props) {
  return (
    <div className="admin-page admin-shell">
      <div className="admin-shell__body">
        <AdminSidebar
          activeView={activeView}
          onViewChange={onViewChange}
          navItems={navItems}
          modules={modules}
          infrastructure={infrastructure}
        />
        <main className="admin-main">
          <div className="admin-main__stack">{children}</div>
        </main>
      </div>
    </div>
  );
}
