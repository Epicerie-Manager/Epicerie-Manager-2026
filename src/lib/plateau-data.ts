export type PlateauZone = {
  name: string;
  owner: string;
  focus: string;
  notes: string;
};

export type PlateauWeek = {
  id: string;
  monthId: string;
  label: string;
  dateRange: string;
  theme: string;
  priority: string;
  zones: PlateauZone[];
};

export type PlateauMonth = {
  id: string;
  label: string;
  status: "Actif" | "Archive";
  pdfLabel: string;
};

export const plateauMonths: PlateauMonth[] = [
  {
    id: "2026-03",
    label: "Mars 2026",
    status: "Actif",
    pdfLabel: "Recap plateau A, B, C, D",
  },
  {
    id: "2026-04",
    label: "Avril 2026",
    status: "Archive",
    pdfLabel: "Preparation mensuelle",
  },
];

export const plateauWeeks: PlateauWeek[] = [
  {
    id: "2026-s13",
    monthId: "2026-03",
    label: "Semaine 13",
    dateRange: "du 23 au 29 mars",
    theme: "Pates, riz et accompagnements",
    priority: "Facings et lisibilite promo",
    zones: [
      {
        name: "Plateau A",
        owner: "Sabrina",
        focus: "Pates seches et sauces tomate",
        notes: "Verifier le bloc promo en tete d'allee et les facings familiaux.",
      },
      {
        name: "Plateau B",
        owner: "Katia",
        focus: "Riz, semoule et aides culinaires",
        notes: "Mettre en avant les references multi-lots et corriger les trous.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Conserves legumes et legumes secs",
        notes: "Priorite aux etiquettes prix et au reassort des best sellers.",
      },
      {
        name: "Plateau D",
        owner: "Renfort samedi",
        focus: "Cross-merch avec sauces et condiments",
        notes: "A preparer pour la fin de semaine selon le flux magasin.",
      },
    ],
  },
  {
    id: "2026-s14",
    monthId: "2026-03",
    label: "Semaine 14",
    dateRange: "du 30 mars au 5 avril",
    theme: "Petit-dejeuner et boissons chaudes",
    priority: "Bloc promo de debut de mois",
    zones: [
      {
        name: "Plateau A",
        owner: "Sabrina",
        focus: "Cafe moulu et capsules",
        notes: "Verifier le balisage et les mecaniques x2 produits.",
      },
      {
        name: "Plateau B",
        owner: "Katia",
        focus: "Chocolat poudre et cereales",
        notes: "Conserver une lecture simple pour le mobile et les renforts.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Biscuits petit-dejeuner",
        notes: "Prevoir la remise au propre apres le samedi.",
      },
      {
        name: "Plateau D",
        owner: "Manager",
        focus: "ILV et stop-rayons saisonniers",
        notes: "Zone de pilotage pour les ajustements de mise en avant.",
      },
    ],
  },
  {
    id: "2026-s15",
    monthId: "2026-04",
    label: "Semaine 15",
    dateRange: "du 6 au 12 avril",
    theme: "Apero et salaisons",
    priority: "Preparation periode vacances",
    zones: [
      {
        name: "Plateau A",
        owner: "Katia",
        focus: "Biscuits aperitif",
        notes: "Verifier les capacitaires avant implantation.",
      },
      {
        name: "Plateau B",
        owner: "Sabrina",
        focus: "Cacahuetes et fruits secs",
        notes: "Reprendre l'implantation du PDF de reference.",
      },
      {
        name: "Plateau C",
        owner: "Mehdi",
        focus: "Tapas et olives",
        notes: "Confirmer l'espace disponible avec le rayon frais.",
      },
      {
        name: "Plateau D",
        owner: "Manager",
        focus: "Zone saisonniere",
        notes: "Ajustements a valider avant publication.",
      },
    ],
  },
];
