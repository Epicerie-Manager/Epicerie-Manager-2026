export type HelpTutorial = {
  slug: string;
  title: string;
  audience: string;
  description: string;
  htmlPath: string;
  accent: string;
  light: string;
};

export const helpTutorials: HelpTutorial[] = [
  {
    slug: "collaborateur",
    title: "Tutoriel collaborateur",
    audience: "Collaborateurs, manager, directrice",
    description:
      "Présentation guidée de l'application collaborateur pour expliquer l'accès, les écrans clés et les usages quotidiens.",
    htmlPath: "/tutorial-collaborateur.html",
    accent: "#D40511",
    light: "#fff1f2",
  },
  {
    slug: "manager-terrain",
    title: "Tutoriel manager terrain",
    audience: "Managers, support terrain, direction",
    description:
      "Présentation de l'application manager terrain pour montrer le pilotage mobile, les saisies et les écrans d'action.",
    htmlPath: "/tutorial-manager-terrain.html",
    accent: "#1d4ed8",
    light: "#eff6ff",
  },
  {
    slug: "reimplantations",
    title: "Reimplantations mai-juin",
    audience: "Managers, direction, equipes magasin",
    description:
      "Planning visuel des reimplantations avec Gantt, tableau de suivi, calendrier et plans consultables directement depuis l'aide.",
    htmlPath: "/reimplantation-v3.html",
    accent: "#0f766e",
    light: "#ecfdf5",
  },
];

export function getHelpTutorial(slug: string) {
  return helpTutorials.find((tutorial) => tutorial.slug === slug) ?? null;
}
