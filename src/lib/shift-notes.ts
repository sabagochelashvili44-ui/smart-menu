export type ShiftNote = {
  id: string;
  restaurant_id: string;
  title: string;
  body: string;
  author_email: string;
  author_role: string | null;
  created_at: string;
};

export function toShiftNote(row: Record<string, unknown>): ShiftNote {
  return {
    id: String(row.id ?? ""),
    restaurant_id: String(row.restaurant_id ?? ""),
    title: String(row.title ?? "").trim(),
    body: String(row.body ?? "").trim(),
    author_email: String(row.author_email ?? "").trim(),
    author_role: row.author_role ? String(row.author_role) : null,
    created_at: String(row.created_at ?? ""),
  };
}
