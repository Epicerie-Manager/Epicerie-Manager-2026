import type { Operation, RayonPlan } from "@/lib/plan-rayon-data";
import { createClient } from "@/lib/supabase";

type MassPlanCell = { label: string; color: string; rotation: number };
type MassPlanAlley = {
  label: string;
  color: string;
  rotation: number;
  orientation: "horizontal" | "vertical";
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};
type MassPlanLinkedView = {
  viewId: string;
  startRow: number;
  startCol: number;
};
type MassPlanViewState = {
  id: string;
  title: string;
  icon: string;
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  cells: Record<string, MassPlanCell>;
  alleys: Record<string, MassPlanAlley>;
  linkedViews: Record<string, MassPlanLinkedView>;
};

export type PlanState = Record<string, RayonPlan>;
export type MassPlanState = {
  activeViewId: string;
  views: Record<string, MassPlanViewState>;
};

export type PlanRayonStateRow = {
  id: string;
  store_key: string;
  operations: Operation[];
  plans: PlanState;
  mass_plan: MassPlanState;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function loadPlanRayonState(storeKey: string): Promise<PlanRayonStateRow | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plan_rayon_states")
      .select("*")
      .eq("store_key", storeKey)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as PlanRayonStateRow | null) ?? null;
  } catch (error) {
    return null;
  }
}

export async function savePlanRayonState(
  storeKey: string,
  state: {
    operations: Operation[];
    plans: PlanState;
    mass_plan: MassPlanState;
  },
): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { error } = await supabase.from("plan_rayon_states").upsert(
      {
        store_key: storeKey,
        operations: state.operations,
        plans: state.plans,
        mass_plan: state.mass_plan,
        updated_by: user?.id ?? null,
      },
      { onConflict: "store_key" },
    );

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
