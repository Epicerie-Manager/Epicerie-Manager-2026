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

export type PlateauOperation = {
  slot: string;
  zone?: string;
  operation: string;
};

export const plateauMonths: PlateauMonth[] = [
  {
    id: "2026-03",
    label: "Mars",
    status: "Actif",
    pdfLabel: "Recap plateau A, B, C, D",
  },
  {
    id: "2026-04",
    label: "Avril",
    status: "Archive",
    pdfLabel: "Preparation mensuelle",
  },
  {
    id: "2026-05",
    label: "Mai",
    status: "Archive",
    pdfLabel: "Recap plateau A, B, C, D",
  },
  {
    id: "2026-06",
    label: "Juin",
    status: "Archive",
    pdfLabel: "Recap plateau A, B, C, D",
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

export const plateauOperationsByMonth: Record<
  string,
  Record<string, PlateauOperation[]>
> = {
  "2026-03": {
    "Plateau A": [
      { slot: "Mars 1", zone: "Entree", operation: "Nettoyage rangement" },
      { slot: "Mars 3-4", zone: "Entree", operation: "Chocolat de Paques" },
      { slot: "Mars 3-4", zone: "Allee centrale", operation: "Foire au vin" },
    ],
    "Plateau B": [
      { slot: "Mars 1-2", zone: "Cote ecolier", operation: "Jardin" },
      { slot: "Mars 1-2", zone: "Cote LSE", operation: "Cuisson" },
      { slot: "Mars 3-4", zone: "Cote LSE", operation: "Paques non alimentaire" },
    ],
    "Plateau C/D": [
      { slot: "Mars 1", operation: "Fete de la mer" },
      { slot: "Mars 2-3", operation: "Little Italy" },
      { slot: "Mars 4", operation: "Tropiques" },
    ],
  },
  "2026-04": {
    "Plateau A": [
      { slot: "Avril 1", operation: "Gastro de Paques" },
      { slot: "Avril 2", operation: "Bebe" },
      { slot: "Avril 3", operation: "Repli bebe" },
    ],
    "Plateau B": [
      { slot: "Avril 1", operation: "Jardin + ete" },
      { slot: "Avril 2+", operation: "Ete non alimentaire" },
    ],
    "Plateau C/D": [
      { slot: "Avril 1", operation: "Gastro Paques MBA" },
      { slot: "Avril 2", operation: "Bretagne" },
      { slot: "Avril 3", operation: "Les halles" },
    ],
  },
  "2026-05": {
    "Plateau A": [
      { slot: "Mai 1-2", operation: "Top mai + ete lingerie" },
      { slot: "Mai 3", operation: "Bio produits laitiers" },
      { slot: "Mai 4", operation: "Ete apero + vins" },
    ],
    "Plateau B": [
      { slot: "Mai 1-5", operation: "Jardin + ete jouet" },
      { slot: "Mai 4-5", operation: "Fete des meres" },
    ],
    "Plateau C/D": [
      { slot: "Mai 1-2", operation: "MBA BBQ" },
      { slot: "Mai 3-4", operation: "Italie" },
      { slot: "Mai 5", operation: "XL fete des meres" },
    ],
  },
  "2026-06": {
    "Plateau A": [
      { slot: "Juin 1", operation: "Repli XL" },
      { slot: "Juin 2", operation: "Foire alcool BBQ" },
      { slot: "Juin 3", operation: "Beaute" },
      { slot: "Juin 4", operation: "Les top" },
    ],
    "Plateau B": [
      { slot: "Juin 1-3", operation: "Jardin" },
      { slot: "Juin 4", operation: "Soldes" },
      { slot: "Juin 3", operation: "Depart en vacances" },
    ],
    "Plateau C/D": [
      { slot: "Juin 1", operation: "Fete mer" },
      { slot: "Juin 2", operation: "Fete fleg" },
      { slot: "Juin 3", operation: "Fete des stands" },
      { slot: "Juin 4", operation: "Les halles" },
    ],
  },
};
