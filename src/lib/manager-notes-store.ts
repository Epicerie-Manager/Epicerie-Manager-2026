import { createClient } from "@/lib/supabase";

export type ManagerNote = {
  id: string;
  note: string;
  createdAt: string;
  createdBy: string | null;
  authorName: string;
  entryType: "note" | "task";
  isDone: boolean;
  doneAt: string | null;
};

type ManagerNoteRow = {
  id: string;
  note: string | null;
  created_at: string | null;
  created_by: string | null;
  author_name: string | null;
  entry_type: string | null;
  is_done: boolean | null;
  done_at: string | null;
};

const MANAGER_NOTES_UPDATED_EVENT = "epicerie-manager-notes-updated";

function normalizeManagerNotesError(error: unknown) {
  const objectError =
    error && typeof error === "object"
      ? (error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown })
      : null;
  const messageParts = [
    error instanceof Error ? error.message : "",
    typeof objectError?.message === "string" ? objectError.message : "",
    typeof objectError?.details === "string" ? objectError.details : "",
    typeof objectError?.hint === "string" ? objectError.hint : "",
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const rawMessage = messageParts.join(" ").trim();
  const message = rawMessage.toLowerCase();

  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("new row violates") ||
    message.includes("not allowed") ||
    message.includes("forbidden")
  ) {
    return new Error("Action réservée aux managers.");
  }

  if (message.includes("jwt") || message.includes("auth session missing") || message.includes("not authenticated")) {
    return new Error("Veuillez vous reconnecter.");
  }

  if (message.includes("manager_notes")) {
    return new Error("La table Supabase des notes manager est absente. Appliquez `supabase/patch_manager_notes.sql`.");
  }

  if (rawMessage.trim()) {
    return new Error(rawMessage);
  }

  if (typeof objectError?.code === "string" && objectError.code.trim()) {
    return new Error(`Erreur notes terrain (${objectError.code.trim()}).`);
  }

  return new Error("Impossible de charger ou enregistrer les notes terrain.");
}

function mapManagerNoteRow(row: ManagerNoteRow): ManagerNote {
  return {
    id: String(row.id ?? ""),
    note: String(row.note ?? "").trim(),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    createdBy: row.created_by ? String(row.created_by) : null,
    authorName: String(row.author_name ?? "Manager").trim() || "Manager",
    entryType: row.entry_type === "task" ? "task" : "note",
    isDone: Boolean(row.is_done),
    doneAt: row.done_at ? String(row.done_at) : null,
  };
}

function dispatchManagerNotesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MANAGER_NOTES_UPDATED_EVENT));
}

export function getManagerNotesUpdatedEventName() {
  return MANAGER_NOTES_UPDATED_EVENT;
}

async function loadCurrentManagerAuthorName() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Veuillez vous reconnecter.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw normalizeManagerNotesError(error);

  return {
    userId: user.id,
    authorName: String(data?.full_name ?? user.email ?? "Manager").trim() || "Manager",
  };
}

export async function loadManagerNotes(limit = 6): Promise<ManagerNote[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("manager_notes")
      .select("id,note,created_at,created_by,author_name,entry_type,is_done,done_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as ManagerNoteRow[]).map(mapManagerNoteRow).filter((row) => row.note);
  } catch (error) {
    throw normalizeManagerNotesError(error);
  }
}

export async function createManagerNote(note: string, entryType: "note" | "task" = "note") {
  const normalizedNote = note.trim();
  if (!normalizedNote) {
    throw new Error("La note est vide.");
  }

  try {
    const supabase = createClient();
    const { userId, authorName } = await loadCurrentManagerAuthorName();
    const { data, error } = await supabase
      .from("manager_notes")
      .insert({
        note: normalizedNote,
        created_by: userId,
        author_name: authorName,
        entry_type: entryType,
        is_done: false,
      })
      .select("id,note,created_at,created_by,author_name,entry_type,is_done,done_at")
      .single();

    if (error) throw error;
    const created = mapManagerNoteRow(data as ManagerNoteRow);
    dispatchManagerNotesUpdated();
    return created;
  } catch (error) {
    throw normalizeManagerNotesError(error);
  }
}

export async function updateManagerNoteStatus(noteId: string, isDone: boolean) {
  const normalizedId = noteId.trim();
  if (!normalizedId) {
    throw new Error("Note introuvable.");
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("manager_notes")
      .update({
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null,
      })
      .eq("id", normalizedId)
      .select("id,note,created_at,created_by,author_name,entry_type,is_done,done_at")
      .single();

    if (error) throw error;
    const updated = mapManagerNoteRow(data as ManagerNoteRow);
    dispatchManagerNotesUpdated();
    return updated;
  } catch (error) {
    throw normalizeManagerNotesError(error);
  }
}

export async function deleteManagerNote(noteId: string) {
  const normalizedId = noteId.trim();
  if (!normalizedId) {
    throw new Error("Note introuvable.");
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("manager_notes")
      .delete()
      .eq("id", normalizedId);

    if (error) throw error;
    dispatchManagerNotesUpdated();
  } catch (error) {
    throw normalizeManagerNotesError(error);
  }
}
