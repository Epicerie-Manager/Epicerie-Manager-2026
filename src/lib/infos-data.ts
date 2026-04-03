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

export type InfoAnnouncementTargeting = "all" | "employees" | "rayons";

export type InfoAnnouncementRecipient = {
  id: string;
  employeeId: string;
  employeeName: string;
  seenAt: string | null;
  confirmedAt: string | null;
};

export type InfoAnnouncementReceipt = {
  seenAt: string | null;
  confirmedAt: string | null;
};

export type InfoAnnouncement = {
  id: string;
  date: string;
  createdAt: string;
  title: string;
  content: string;
  priority: InfoAnnouncementPriority;
  publishAt: string | null;
  expiresAt: string | null;
  targeting: InfoAnnouncementTargeting;
  targetEmployeeIds: string[];
  targetRayons: string[];
  confirmationRequired: boolean;
  recipients: InfoAnnouncementRecipient[];
  selfReceipt?: InfoAnnouncementReceipt | null;
};

export type InfoAnnouncementAudienceEmployee = {
  id: string;
  name: string;
  tgRayons: string[];
};

export type InfoAnnouncementAudience = {
  employees: InfoAnnouncementAudienceEmployee[];
  rayons: string[];
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
    createdAt: new Date().toISOString(),
    title: "Bienvenue dans le centre Info",
    content: "Creez vos sections documentaires et vos annonces manager depuis cette page.",
    priority: "normal",
    publishAt: null,
    expiresAt: null,
    targeting: "all",
    targetEmployeeIds: [],
    targetRayons: [],
    confirmationRequired: false,
    recipients: [],
    selfReceipt: null,
  },
];
