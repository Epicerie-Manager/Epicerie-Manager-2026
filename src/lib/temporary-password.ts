function normalizeDisplayName(value: string) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function formatFirstName(value: string) {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!cleaned) return "Temporaire";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function buildTemporaryOfficePassword(fullName: string) {
  const [firstName = "Temporaire"] = normalizeDisplayName(fullName);
  return `${formatFirstName(firstName)}+2026`;
}
