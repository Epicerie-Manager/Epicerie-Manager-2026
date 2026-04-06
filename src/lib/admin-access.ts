const DEFAULT_ADMIN_EMAILS = ["rachid.ben91@gmail.com"];

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getConfiguredAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  const configured = raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_ADMIN_EMAILS;
}

export function getAdminEmails() {
  return [...getConfiguredAdminEmails()];
}

export function isAdminUser(email: string | null | undefined, role?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role ?? "").trim().toLowerCase();

  if (!normalizedEmail) return false;
  if (normalizedRole && normalizedRole !== "manager") return false;

  return getConfiguredAdminEmails().includes(normalizedEmail);
}
