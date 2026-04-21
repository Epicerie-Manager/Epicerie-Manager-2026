"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleKey } from "@/lib/theme";
import { moduleThemes } from "@/lib/theme";

const navigation: Array<{ href: string; label: string; key: ModuleKey }> = [
  { href: "/", label: "Accueil", key: "dashboard" },
  { href: "/planning", label: "Planning", key: "planning" },
  { href: "/plan-tg", label: "Plan TG", key: "plantg" },
  { href: "/plan-de-rayon", label: "Plan de rayon", key: "planriz" },
  { href: "/plan-plateau", label: "Plateaux", key: "plateau" },
  { href: "/stats", label: "Stats", key: "balisage" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="main-nav" aria-label="Navigation principale">
      {navigation.map((item) => {
        const isActive =
          item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? " nav-link-active" : ""}`}
            style={{
              borderBottomColor: moduleThemes[item.key].color,
              color: isActive ? moduleThemes[item.key].color : undefined,
              borderColor: isActive ? moduleThemes[item.key].color : undefined,
              background: isActive ? moduleThemes[item.key].light : undefined,
              boxShadow: isActive
                ? `inset 0 0 0 1px ${moduleThemes[item.key].medium}, 0 10px 20px ${moduleThemes[item.key].medium}`
                : undefined,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
