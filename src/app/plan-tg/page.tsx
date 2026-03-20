import { ModulePage } from "@/components/module-page";

export default function PlanTgPage() {
  return (
    <ModulePage
      title="Plan TG / GB"
      kicker="Module V1"
      description="Cette page servira a consulter les lignes TG et GB par semaine, par responsable et par rayon. Le module reprendra la structure du fichier actuel tout en offrant une lecture plus simple sur mobile."
      cards={[
        {
          title: "Filtres principaux",
          text: "Le coeur du module reposera sur des filtres utiles terrain.",
          items: ["Semaine", "Responsable", "Type TG / GB"],
        },
        {
          title: "Informations affichees",
          text: "Chaque ligne devra etre lisible rapidement sans ouvrir une feuille complexe.",
          items: [
            "Rayon",
            "Famille",
            "Produit",
            "Quantite",
            "Mecanique commerciale",
          ],
        },
        {
          title: "Usage manager",
          text: "La manager pourra retrouver rapidement qui fait quoi et sur quelle semaine.",
        },
      ]}
    />
  );
}
