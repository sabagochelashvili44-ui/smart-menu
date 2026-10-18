import { getPublicAppUrl } from "@/lib/app-url";
import { errorMessage } from "@/lib/http-error";
import { normalizeStaffEmail } from "@/lib/staff-role-shared";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantApi } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function roleLabelKa(role: string) {
  if (role === "manager") return "მენეჯერი";
  return "მიმტანი";
}

function inviteHtml(roleKa: string, restaurantName: string, registerUrl: string) {
  const role = escapeHtml(roleKa);
  const name = escapeHtml(restaurantName);
  const href = escapeHtml(registerUrl);
  return `<!doctype html>
<html lang="ka">
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1f1b16;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  გამარჯობა, თქვენ მოგენიჭათ <b>${role}</b>-ის სტატუსი რესტორან <b>${name}</b>-ის სისტემაში.
                </p>
                <p style="margin:24px 0 0;">
                  <a href="${href}" style="display:inline-block;background:#6d0808;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
                    რეგისტრაციის გავლა
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function upsertStaffRow(
  restaurantId: string,
  email: string,
  role: "manager" | "waiter",
) {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("restaurant_staff")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .ilike("email", email)
    .maybeSingle();

  if (existing.data?.id) {
    return supabase
      .from("restaurant_staff")
      .update({ email, role })
      .eq("id", existing.data.id)
      .eq("restaurant_id", restaurantId);
  }
  return supabase.from("restaurant_staff").insert({
    restaurant_id: restaurantId,
    email,
    role,
  });
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner"]);
  if (!tenant.ok) return tenant.response;

  try {
    const body = (await request.json()) as {
      email?: string;
      role?: string;
      restaurant_name?: string;
      restaurant_id?: string;
    };

    const email = normalizeStaffEmail(body.email);
    const role = body.role === "manager" ? "manager" : "waiter";
    const restaurantId = String(body.restaurant_id ?? "").trim();
    const restaurantName =
      String(body.restaurant_name ?? "").trim() || tenant.restaurant.name;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (restaurantId && restaurantId !== tenant.restaurant.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set on the server." },
        { status: 500 },
      );
    }

    const { error } = await upsertStaffRow(tenant.restaurant.id, email, role);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const registerUrl = `${getPublicAppUrl()}/register?email=${encodeURIComponent(email)}`;
    const { error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "მოწვევა: Smart Menu-ს სამართავი პანელი",
      html: inviteHtml(roleLabelKa(role), restaurantName, registerUrl),
    });

    if (emailError) {
      throw emailError;
    }

    revalidatePath("/admin/staff");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
