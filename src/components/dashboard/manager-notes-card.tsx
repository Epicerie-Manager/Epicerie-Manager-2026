"use client";

import ManagerNotesPanel from "@/components/manager/manager-notes-panel";

export default function ManagerNotesCard() {
  return (
    <ManagerNotesPanel
      compact
      limit={12}
      listMaxHeight={420}
      title="Notes et taches terrain"
      description="Ajoute une note ou une tache a faire directement depuis le dashboard. La liste reste synchronisee avec Manager Terrain."
    />
  );
}
