export type InfoCategoryId = "proc" | "secu" | "rh" | "outils" | "contacts";

export type InfoItem = {
  title: string;
  description: string;
};

export type InfoCategory = {
  id: InfoCategoryId;
  label: string;
  items: InfoItem[];
};

export type InfoAnnouncement = {
  id: number;
  date: string;
  title: string;
  content: string;
  important?: boolean;
};

export const infoCategories: InfoCategory[] = [
  {
    id: "proc",
    label: "Procedures",
    items: [
      { title: "Ouverture magasin", description: "Check-list des taches a l'ouverture." },
      { title: "Fermeture magasin", description: "Procedure de fermeture et securisation." },
      { title: "Reception marchandise", description: "Etapes de reception et controle." },
      { title: "Mise en rayon", description: "Regles de facing, rotation et balisage." },
      { title: "Gestion des DLC", description: "Controle des dates limites." },
      { title: "Inventaire tournant", description: "Procedure de comptage par rayon." },
    ],
  },
  {
    id: "secu",
    label: "Securite et hygiene",
    items: [
      { title: "Plan d'evacuation", description: "Sorties de secours et point de rassemblement." },
      { title: "Premiers secours", description: "Reflexes en cas d'accident." },
      { title: "Normes HACCP", description: "Regles d'hygiene alimentaire." },
      { title: "EPI obligatoires", description: "Equipements de protection par poste." },
    ],
  },
  {
    id: "rh",
    label: "Ressources humaines",
    items: [
      { title: "Convention collective", description: "Points cles du commerce alimentaire." },
      { title: "Droits aux conges", description: "Calcul des CP, RTT et jours feries." },
      { title: "Mutuelle et prevoyance", description: "Couverture sante et contacts utiles." },
      { title: "Contacts RH magasin", description: "Referents RH et circuits de validation." },
    ],
  },
  {
    id: "outils",
    label: "Outils et applications",
    items: [
      { title: "Guide Auchan App", description: "Utilisation de l'application mobile." },
      { title: "Etiquetage electronique", description: "Fonctionnement des etiquettes prix." },
      { title: "Systeme de caisse", description: "Aide-memoire operations caisse." },
      { title: "Commandes fournisseurs", description: "Passer et suivre les commandes." },
    ],
  },
  {
    id: "contacts",
    label: "Contacts utiles",
    items: [
      { title: "Direction magasin", description: "Directeur et adjoints, poste 100." },
      { title: "Service technique", description: "Maintenance et froid, poste 150." },
      { title: "Securite", description: "Responsable securite, poste 200." },
      { title: "Fournisseurs epicerie", description: "Contacts principaux fournisseurs." },
    ],
  },
];

export const infoAnnouncements: InfoAnnouncement[] = [
  {
    id: 1,
    date: "15 mars 2026",
    title: "Plans plateau 2026 disponibles",
    content: "Mars a juin sont disponibles dans la section Plateaux.",
    important: true,
  },
  {
    id: 2,
    date: "1 mars 2026",
    title: "Planning mars publie",
    content: "Nouvelles rotations et ajustements de semaine integres.",
  },
  {
    id: 3,
    date: "20 fevrier 2026",
    title: "Tri caddie mars",
    content: "Nouvelle rotation des binomes pour le mois en cours.",
  },
];
