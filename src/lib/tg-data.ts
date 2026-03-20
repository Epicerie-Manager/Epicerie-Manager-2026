export type TgEntry = {
  weekId: string;
  rayon: string;
  family: "Sale" | "Sucre";
  type: "TG" | "GB";
  manager: string;
  product: string;
  quantity?: string;
  mechanic?: string;
};

export const tgWeeks = [
  { id: "10 Mars 26", label: "S10 - 2 au 8 mars" },
  { id: "02 Janvier 26", label: "S02 - 5 au 11 janvier" },
  { id: "19 Mai 26", label: "S19 - 4 au 10 mai" },
];

export const tgEntries: TgEntry[] = [
  {
    weekId: "10 Mars 26",
    rayon: "CONS. LEGUMES",
    family: "Sale",
    type: "GB",
    manager: "JEREMY",
    product: "JEAN MARTIN 48/48/96/90 2EME 50% · RAVIOLI TOMATES X2",
  },
  {
    weekId: "10 Mars 26",
    rayon: "CONS. LEGUMES",
    family: "Sale",
    type: "TG",
    manager: "JEREMY",
    product: "PETIT NAVIRE THON X3",
    quantity: "3 BOX",
    mechanic: "2EME 60%",
  },
  {
    weekId: "10 Mars 26",
    rayon: "CHIPS",
    family: "Sale",
    type: "GB",
    manager: "MOHAMED",
    product: "CHEETOS ORIGINAL FROMAGE 80G 120UVC",
  },
  {
    weekId: "10 Mars 26",
    rayon: "CHIPS",
    family: "Sale",
    type: "TG",
    manager: "MOHCINE",
    product: "LAYS CHIPS",
    quantity: "140/105/96/160",
    mechanic: "2+1",
  },
  {
    weekId: "10 Mars 26",
    rayon: "CHOCOLAT & CONFISERIE",
    family: "Sucre",
    type: "TG",
    manager: "CECILE",
    product: "MILKA CHOCOLAT / KINDER CRUNCHY / KINDERINI",
    quantity: "1 BOX / 120 / 160",
    mechanic: "2EME 50%",
  },
  {
    weekId: "10 Mars 26",
    rayon: "CAFE",
    family: "Sucre",
    type: "TG",
    manager: "PASCALE",
    product: "CARTE NOIRE MOULU 2X250G",
    quantity: "1 PALETTE 608 + 60 UVC",
    mechanic: "2+1",
  },
  {
    weekId: "02 Janvier 26",
    rayon: "CHIPS",
    family: "Sale",
    type: "TG",
    manager: "MOHAMED",
    product: "PRINGLES",
    quantity: "2 BOX",
    mechanic: "2EME 60%",
  },
  {
    weekId: "02 Janvier 26",
    rayon: "CONDIMENTS",
    family: "Sale",
    type: "TG",
    manager: "LIYAKATH",
    product: "HEINZ TOMATO KETCHUP",
    quantity: "190/60",
    mechanic: "2EME 60%",
  },
  {
    weekId: "19 Mai 26",
    rayon: "BIO 1",
    family: "Sale",
    type: "TG",
    manager: "KAMEL",
    product: "Selection bio promotion semaine 19",
    quantity: "1 BOX",
    mechanic: "RI 30%",
  },
];
