export type DefaultSectionKey = "sucree" | "salee" | "pdm" | "bio";
export type SectionKey = string;

export type InterventionMoment = "Jour" | "Nuit";
export type InterventionStatus = "todo" | "cours" | "fait";

export type Intervention = {
  id: string;
  start: string;
  end: string;
  originalStart: string;
  originalEnd: string;
  moment: InterventionMoment;
  section: SectionKey;
  rayon: string;
  subtitle: string;
  charged: boolean;
  status: InterventionStatus;
  responsibleAuchan: string;
  responsibleSupplier: string;
  notes: string;
};

export type Operation = {
  id: string;
  name: string;
  interventions: Intervention[];
  locked?: boolean;
};

export type PlanColumn = {
  id: string;
  name: string;
  color: string;
  cells: string[];
};

export type RayonPlan = {
  title: string;
  subtitle: string;
  icon?: string;
  columns: PlanColumn[];
};

export const SECTION_THEME: Record<
  DefaultSectionKey,
  { color: string; light: string; text: string; label: string; icon: string }
> = {
  sucree: { color: "#0a4f98", light: "#dbeeff", text: "#052a52", label: "Épicerie sucrée", icon: "🍬" },
  salee: { color: "#d71920", light: "#ffe8ec", text: "#6b0c0f", label: "Épicerie salée", icon: "🧂" },
  pdm: { color: "#1b8b4b", light: "#eaf7ef", text: "#0a3d20", label: "Produits du monde", icon: "🌍" },
  bio: { color: "#6741e8", light: "#f1eeff", text: "#2d198a", label: "Bio / Diét.", icon: "🌿" },
};

function makeIntervention(
  id: string,
  start: string,
  end: string,
  moment: InterventionMoment,
  section: SectionKey,
  rayon: string,
  subtitle: string,
  charged = false,
): Intervention {
  return {
    id,
    start,
    end,
    originalStart: start,
    originalEnd: end,
    moment,
    section,
    rayon,
    subtitle,
    charged,
    status: "todo",
    responsibleAuchan: "",
    responsibleSupplier: "",
    notes: "",
  };
}

function makeColumn(id: string, name: string, color: string, cells: string[]): PlanColumn {
  return { id, name, color, cells };
}

export const DEFAULT_OPERATIONS: Operation[] = [
  {
    id: "op-default",
    name: "Réimplantation complète 2026",
    locked: true,
    interventions: [
      makeIntervention("i-0", "2026-05-05", "2026-05-05", "Jour", "sucree", "Compléments alimentaires", "Lancement journée"),
      makeIntervention("i-1", "2026-05-06", "2026-05-07", "Nuit", "bio", "Bio + épicerie salée + sucrée", "Grains, moulu, soluble, lait, thés, céréales"),
      makeIntervention("i-2", "2026-05-11", "2026-05-12", "Nuit", "bio", "Diététique", "Minceur, naturelle, sportive, nutrition santé"),
      makeIntervention("i-3", "2026-05-28", "2026-05-29", "Nuit", "pdm", "Produits du monde", "Halal, casher, Asie, Italie, Espagne…"),
      makeIntervention("i-4", "2026-06-04", "2026-06-05", "Nuit", "salee", "Animalerie", ""),
      makeIntervention("i-5", "2026-06-08", "2026-06-09", "Nuit", "sucree", "Biscuiterie + confiserie sucrée", "Biscuits 22 éléments"),
      makeIntervention("i-6", "2026-06-09", "2026-06-10", "Nuit", "sucree", "Chocolat + pâtisserie indus", "Tablettes, confiserie, savane, napolitain"),
      makeIntervention("i-7", "2026-06-11", "2026-06-12", "Nuit", "sucree", "Café + aides culinaires", "Dosettes, moulu, grains, épices, vinaigre, sauces", true),
      makeIntervention("i-8", "2026-06-15", "2026-06-16", "Nuit", "sucree", "Viennoiserie + salé", "Pain de mie, conserves légumes, pâtes, sauces chaudes", true),
      makeIntervention("i-9", "2026-06-18", "2026-06-19", "Nuit", "salee", "Céréales + conserves + plats", "Panification, fruits au sirop, conserves poisson, potages", true),
      makeIntervention("i-10", "2026-06-22", "2026-06-23", "Nuit", "sucree", "Compotes + apéro", "Tartinables, chips apéritifs"),
      makeIntervention("i-11", "2026-06-23", "2026-06-24", "Nuit", "sucree", "Thé + café soluble + pâtisserie", "Lait, madeleines, quatre-quarts"),
    ],
  },
];

export const DEFAULT_PLANS: Record<string, RayonPlan> = {
  sucree: {
    title: "Plan Épicerie Sucrée",
    subtitle: "Café, thés, céréales, biscuits, chocolat, confiserie, compotes",
    columns: [
      makeColumn("sucree-0", "Café / Thés", "#C07820", ["Dosettes", "Moulu", "Soluble", "Grains", "Thés", "Infusions"]),
      makeColumn("sucree-1", "Céréales", "#D4A820", ["Granola", "Muesli", "Corn flakes", "Enfants", "BIO"]),
      makeColumn("sucree-2", "Viennoiserie", "#C05528", ["Pain de mie", "Biscottes", "Tartines", "Panification"]),
      makeColumn("sucree-3", "Compotes/Conf.", "#982848", ["Compotes", "Confitures", "Tartinables", "Cr. dessert"]),
      makeColumn("sucree-4", "Biscuiterie", "#6030A8", ["Biscuits 22", "Pâtisserie ind.", "Crêpes", "Savane"]),
      makeColumn("sucree-5", "Chocolat/Conf.", "#982860", ["Tablettes 7", "Choco 10", "Confiserie", "Bonbons"]),
    ],
  },
  salee: {
    title: "Plan Épicerie Salée",
    subtitle: "Apéro, conserves, pâtes, sauces, animalerie",
    columns: [
      makeColumn("salee-0", "Apéro / Chips", "#B83018", ["Chips", "Biscuits apéro", "Cacahuètes", "Mélanges"]),
      makeColumn("salee-1", "Conserves légumes", "#607010", ["Tomates", "Haricots", "Petits pois", "Maïs"]),
      makeColumn("salee-2", "Conserves poisson", "#185890", ["Thon", "Sardines", "Saumon", "Maquereau"]),
      makeColumn("salee-3", "Pâtes / Riz", "#A06818", ["Pâtes ali.", "Riz", "Semoule", "Légumineuses"]),
      makeColumn("salee-4", "Sauces / Huiles", "#184870", ["Huiles", "Vinaigrettes", "Sauces chaudes", "Épices"]),
      makeColumn("salee-5", "Animalerie", "#484880", ["Chien", "Chat", "Rongeurs", "Oiseaux"]),
    ],
  },
  pdm: {
    title: "Plan Produits du Monde",
    subtitle: "Halal, Casher, Asie, Amériques, Europe",
    columns: [
      makeColumn("pdm-0", "Halal", "#0E7050", ["Halal H3", "Épices halal", "Plats halal", "Boissons"]),
      makeColumn("pdm-1", "Casher", "#186888", ["Casher", "Traiteur monde", "Pains monde", "Biscuits"]),
      makeColumn("pdm-2", "Asie", "#0E5858", ["Asie H3", "Sauces asie", "Nouilles", "Riz asie"]),
      makeColumn("pdm-3", "Amériques", "#185890", ["Tex Mex", "USA / GB", "Mexique", "Canada"]),
      makeColumn("pdm-4", "Europe", "#383880", ["Italie", "Espagne", "Portugal", "Turquie"]),
    ],
  },
  bio: {
    title: "Plan Bio / Diététique",
    subtitle: "Bio quotidien, diététique, compléments",
    columns: [
      makeColumn("bio-0", "BIO Quotidien", "#4A42A8", ["Bio salé", "Bio sucré", "Épicerie BIO", "Frais BIO"]),
      makeColumn("bio-1", "Diététique", "#6830A0", ["Minceur", "Naturelle", "Sportive", "Nutrition santé"]),
      makeColumn("bio-2", "Compléments", "#902888", ["Compl. ali.", "BSA", "Protéines", "Vitamines"]),
    ],
  },
};

export function cloneOperations(operations: Operation[]) {
  return operations.map((operation) => ({
    ...operation,
    interventions: operation.interventions.map((intervention) => ({ ...intervention })),
  }));
}

export function clonePlans(plans: Record<string, RayonPlan>) {
  return Object.fromEntries(
    Object.entries(plans).map(([key, plan]) => [
      key,
      {
        ...plan,
        columns: plan.columns.map((column) => ({ ...column, cells: [...column.cells] })),
      },
    ]),
  ) as Record<string, RayonPlan>;
}
