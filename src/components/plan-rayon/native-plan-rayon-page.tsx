"use client";

import dynamic from "next/dynamic";

export const NativePlanRayonPage = dynamic(
  () => import("@/components/plan-rayon/native-plan-rayon").then((module) => module.NativePlanRayon),
  {
    ssr: false,
    loading: () => null,
  },
);
