"use client";

import { usePathname } from "next/navigation";
import { getThemeByPathname, moduleThemes } from "@/lib/theme";

export function useModuleTheme() {
  const pathname = usePathname();
  const key = getThemeByPathname(pathname);

  return { key, theme: moduleThemes[key] };
}
