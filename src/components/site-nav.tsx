"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Accueil", theme: "theme-home" },
  { href: "/planning", label: "Planning", theme: "theme-planning" },
  { href: "/plan-tg", label: "Plan TG", theme: "theme-tg" },
  { href: "/plan-plateau", label: "Plateaux", theme: "theme-plateau" },
  { href: "/stats", label: "Stats", theme: "theme-stats" },
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
            className={`nav-link ${item.theme}${isActive ? " nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
