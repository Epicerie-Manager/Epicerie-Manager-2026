import { Suspense } from "react";
import PlanningApp from "@/components/planning/planning-epiceriebis";

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningApp />
    </Suspense>
  );
}
