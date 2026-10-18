import { toShiftNote } from "@/lib/shift-notes";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantApi } from "@/lib/tenant";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SELECT =
  "id, restaurant_id, title, body, author_email, author_role, created_at, is_active";

export async function GET() {
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shift_notes")
    .select(SELECT)
    .eq("restaurant_id", tenant.restaurant.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notes: (data ?? []).map((row) => toShiftNote(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      content?: string;
    };
    const title = String(body.title ?? "").trim();
    const content = String(body.body ?? body.content ?? "").trim();
    if (!content) {
      return NextResponse.json(
        { error: "Note content is required." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("shift_notes")
      .insert({
        restaurant_id: tenant.restaurant.id,
        title: title || content.slice(0, 80),
        body: content,
        author_email: String(tenant.user.email ?? "").trim().toLowerCase(),
        author_role: tenant.staffRole,
        is_active: true,
      })
      .select(SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Could not save the note." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      note: toShiftNote(data as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save the note.",
      },
      { status: 500 },
    );
  }
}
