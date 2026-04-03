export type MetreQuestionType = "rating" | "boolean";
export type BooleanAnswer = "OUI" | "NON" | null;

export type MetreQuestion = {
  key: string;
  label: string;
  type: MetreQuestionType;
  expectedAnswer?: "OUI" | "NON";
};

export type MetreSection = {
  key:
    | "presentation_rayon"
    | "balisage_signaletique"
    | "ruptures_fraicheur"
    | "reserve_logistique"
    | "epi";
  label: string;
  coefficient: number;
  type: MetreQuestionType;
  questions: MetreQuestion[];
};

export const METRE_A_METRE_SECTIONS: MetreSection[] = [
  {
    key: "presentation_rayon",
    label: "Presentation Rayon",
    coefficient: 20,
    type: "rating",
    questions: [
      { key: "fill_rate", label: "Taux de remplissage", type: "rating" },
      { key: "planogram_compliance", label: "Respect implantation", type: "rating" },
      { key: "facing_consistency", label: "Facing / Cohérence", type: "rating" },
      { key: "shelf_cap_condition", label: "État des casquettes", type: "rating" },
      { key: "department_cleanliness", label: "Propreté du rayon", type: "rating" },
      { key: "out_of_place_items", label: "OVNIS (hors rayon)", type: "rating" },
    ],
  },
  {
    key: "balisage_signaletique",
    label: "Balisage & Signalétique",
    coefficient: 15,
    type: "boolean",
    questions: [
      { key: "promo_signage_10x10", label: "Balisage promo 10x10", type: "boolean", expectedAnswer: "OUI" },
      { key: "promo_signage_20x10", label: "Balisage promo 20x10", type: "boolean", expectedAnswer: "OUI" },
      { key: "promo_signage_a4_tg", label: "Balisage promo A4 TG", type: "boolean", expectedAnswer: "OUI" },
      { key: "price_labels_present", label: "Étiquettes prix présentes", type: "boolean", expectedAnswer: "OUI" },
      { key: "label_left_of_product", label: "Étiquette à gauche du produit", type: "boolean", expectedAnswer: "OUI" },
      { key: "missing_labels_present", label: "Étiquettes manquantes", type: "boolean", expectedAnswer: "NON" },
    ],
  },
  {
    key: "ruptures_fraicheur",
    label: "Ruptures & Fraîcheur",
    coefficient: 25,
    type: "boolean",
    questions: [
      { key: "stockout_flashed", label: "Rupture flashée ?", type: "boolean", expectedAnswer: "OUI" },
      { key: "stockout_processed", label: "Traitement des ruptures effectué ?", type: "boolean", expectedAnswer: "OUI" },
      { key: "expired_products_present", label: "Produits périmés présents dans le rayon ?", type: "boolean", expectedAnswer: "NON" },
    ],
  },
  {
    key: "reserve_logistique",
    label: "Réserve & Logistique",
    coefficient: 20,
    type: "boolean",
    questions: [
      { key: "pallets_wrapped", label: "Palettes filmées", type: "boolean", expectedAnswer: "OUI" },
      { key: "pallet_tagged", label: "Palette balisée", type: "boolean", expectedAnswer: "OUI" },
      { key: "trolley_sorting_done", label: "Tri des caddies effectué", type: "boolean", expectedAnswer: "OUI" },
      { key: "cardboard_or_plastic_present", label: "Présence Cartons/Plastiques", type: "boolean", expectedAnswer: "NON" },
      { key: "breakage_present", label: "Présence Casse", type: "boolean", expectedAnswer: "NON" },
      { key: "stacked_pallet_in_place", label: "Palette gerbée à sa place", type: "boolean", expectedAnswer: "OUI" },
    ],
  },
  {
    key: "epi",
    label: "EPI",
    coefficient: 20,
    type: "boolean",
    questions: [
      { key: "auchan_vest_worn", label: "Gilet Auchan", type: "boolean", expectedAnswer: "OUI" },
      { key: "safety_shoes_worn", label: "Chaussures de sécurité portées", type: "boolean", expectedAnswer: "OUI" },
    ],
  },
];

export type MetreSectionResponse = {
  comment: string;
  ratings: Record<string, number | null>;
  booleans: Record<string, BooleanAnswer>;
};

export type MetreAuditDraft = {
  auditDate: string;
  rayon: string;
  managerName: string;
  collaboratorName: string;
  employeeId: string;
  progressAxes: string;
  sections: Record<string, MetreSectionResponse>;
};

export function createEmptyMetreAuditDraft(): MetreAuditDraft {
  const sections = Object.fromEntries(
    METRE_A_METRE_SECTIONS.map((section) => [
      section.key,
      {
        comment: "",
        ratings: Object.fromEntries(
          section.questions
            .filter((question) => question.type === "rating")
            .map((question) => [question.key, null]),
        ),
        booleans: Object.fromEntries(
          section.questions
            .filter((question) => question.type === "boolean")
            .map((question) => [question.key, null]),
        ),
      } satisfies MetreSectionResponse,
    ]),
  ) as Record<string, MetreSectionResponse>;

  return {
    auditDate: new Date().toISOString().slice(0, 10),
    rayon: "",
    managerName: "",
    collaboratorName: "",
    employeeId: "",
    progressAxes: "",
    sections,
  };
}

export function computeSectionScore(section: MetreSection, response: MetreSectionResponse) {
  if (section.type === "rating") {
    const values = section.questions
      .map((question) => response.ratings[question.key])
      .filter((value): value is number => typeof value === "number");
    if (!values.length) return 0;
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Number(((average / 5) * 100).toFixed(2));
  }

  const values = section.questions
    .map((question) => response.booleans[question.key])
    .filter((value): value is "OUI" | "NON" => value === "OUI" || value === "NON");
  if (!values.length) return 0;
  const validCount = section.questions.filter((question) => {
    const answer = response.booleans[question.key];
    return answer && answer === question.expectedAnswer;
  }).length;
  return Number(((validCount / section.questions.length) * 100).toFixed(2));
}

export function computeGlobalScore(draft: MetreAuditDraft) {
  const weighted = METRE_A_METRE_SECTIONS.reduce((sum, section) => {
    const sectionResponse = draft.sections[section.key];
    const sectionScore = computeSectionScore(section, sectionResponse);
    return sum + (sectionScore * section.coefficient) / 100;
  }, 0);
  return Number(weighted.toFixed(2));
}
