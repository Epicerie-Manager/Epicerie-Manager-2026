export type InfoCategoryId = "proc" | "secu" | "rh" | "outils" | "contacts";

export type InfoDocumentAttachment = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

export type InfoItem = {
  id: string;
  title: string;
  description: string;
  attachment?: InfoDocumentAttachment;
  createdAt: string;
  updatedAt: string;
};

export type InfoCategory = {
  id: InfoCategoryId;
  label: string;
  items: InfoItem[];
};

export type InfoAnnouncementPriority = "urgent" | "important" | "normal";

export type InfoAnnouncement = {
  id: string;
  date: string;
  title: string;
  content: string;
  priority: InfoAnnouncementPriority;
};

export const infoCategories: InfoCategory[] = [
  {
    id: "proc",
    label: "Procedures",
    items: [],
  },
  {
    id: "secu",
    label: "Securite et hygiene",
    items: [],
  },
  {
    id: "rh",
    label: "Ressources humaines",
    items: [],
  },
  {
    id: "outils",
    label: "Outils et applications",
    items: [],
  },
  {
    id: "contacts",
    label: "Contacts utiles",
    items: [],
  },
];

export const infoAnnouncements: InfoAnnouncement[] = [
  {
    id: "default-1",
    date: "23 mars",
    title: "Bienvenue dans le centre Info",
    content: "Creez vos sections documentaires et vos annonces manager depuis cette page.",
    priority: "normal",
  },
];
