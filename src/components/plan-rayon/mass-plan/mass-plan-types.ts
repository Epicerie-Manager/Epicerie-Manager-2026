export type ElementType = "rayon" | "alley-h" | "alley-v" | "tete-gondole" | "gondole-basse";

export type MassElement = {
  id: string;
  plan_id: string;
  rayon_plan_id: string | null;
  element_type: ElementType;
  label: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string | null;
  rotated: boolean;
  z_index: number;
  rayon_name?: string;
  rayon_color?: string;
  rayon_elem_count?: number;
  rayon_facing_url?: string | null;
  rayon_universe_name?: string;
};

export type MassPlan = {
  id: string;
  store_key: string;
  name: string;
  canvas_w: number;
  canvas_h: number;
  position: number;
  updated_at: string;
  updated_by: string | null;
  updater_name?: string | null;
};

export type RayonLibItem = {
  id: string;
  universe_id: string;
  universe_name: string;
  universe_icon: string;
  universe_color: string;
  name: string;
  color: string;
  elem_count: number;
  facing_image_url: string | null;
  facing_signed_url?: string | null;
};

export type DragLibraryPayload =
  | { kind: "rayon"; rayon: RayonLibItem }
  | { kind: "structure"; elementType: Exclude<ElementType, "rayon"> };

export const GRID = 40;
export const PLAN_TITLE_BAR_HEIGHT = 32;
