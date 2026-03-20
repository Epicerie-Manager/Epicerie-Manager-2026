import { ModulePage } from "@/components/module-page";

export default function StatsPage() {
  return (
    <ModulePage
      title="Stats balisage"
      kicker="Module V1"
      description="Cette page rassemblera les indicateurs mensuels de balisage pour offrir une lecture simple du niveau d'avancement et des alertes."
      cards={[
        {
          title: "Indicateurs attendus",
          text: "Les chiffres visibles dans le fichier actuel seront repris dans une interface plus claire.",
          items: [
            "Total controles",
            "Pourcentage d'avancement",
            "Taux d'erreur",
            "Statut OK / alerte / retard",
          ],
        },
        {
          title: "Vue equipe",
          text: "La manager pourra parcourir les resultats du mois pour toute l'equipe.",
        },
        {
          title: "Vue detaillee",
          text: "Une lecture par employe pourra etre ajoutee dans la meme logique sans refaire tout le module.",
        },
      ]}
    />
  );
}
