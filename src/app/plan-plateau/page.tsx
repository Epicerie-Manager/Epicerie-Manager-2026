import { ModulePage } from "@/components/module-page";

export default function PlanPlateauPage() {
  return (
    <ModulePage
      title="Plan Plateau"
      kicker="Module V1"
      description="Dans la premiere version, cette page integrera le PDF existant de facon claire et consultable. Ensuite, on pourra envisager une version plus structuree par mois et par semaine."
      cards={[
        {
          title: "Consultation rapide",
          text: "Acces direct au document plateau sans passer par Google Site.",
          items: ["Affichage mois par mois", "Consultation mobile", "Acces rapide"],
        },
        {
          title: "Contenu actuel",
          text: "Le PDF reprend les plans plateau A, B, C et D avec une logique hebdomadaire.",
        },
        {
          title: "Evolution possible",
          text: "Plus tard, ce module pourra devenir plus interactif si les donnees sont structurees autrement que dans un PDF.",
        },
      ]}
    />
  );
}
