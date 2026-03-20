import { ModulePage } from "@/components/module-page";

export default function PlanningPage() {
  return (
    <ModulePage
      title="Planning"
      kicker="Module V1"
      description="Cette page accueillera le planning equipe et collaborateur. La prochaine etape sera de brancher les donnees existantes pour afficher les horaires, les statuts de journee et les filtres par mois ou par employe."
      cards={[
        {
          title: "Vue collaborateur",
          text: "Une lecture rapide du jour et de la semaine pour smartphone, tablette et ordinateur.",
          items: [
            "Jour et date",
            "Horaires",
            "Statuts RH, CP, X, FERIE",
          ],
        },
        {
          title: "Vue manager",
          text: "Une vision globale avec filtres pour piloter l'equipe au quotidien.",
          items: ["Filtre par mois", "Filtre par employe", "Vision jour courant"],
        },
        {
          title: "Extensions prevues",
          text: "Des vues complementaires pourront etre ajoutees sans changer la base du module.",
          items: ["Binomes de repos", "Tri caddie", "Exceptions et absences"],
        },
      ]}
    />
  );
}
