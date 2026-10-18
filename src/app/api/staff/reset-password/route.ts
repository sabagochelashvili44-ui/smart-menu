import { getPublicAppUrl } from "@/lib/app-url";
import { errorMessage } from "@/lib/http-error";
import { normalizeStaffEmail } from "@/lib/staff-role-shared";
import { parseSuperAdminEmails } from "@/lib/super-admin-shared";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantApi } from "@/lib/tenant";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const byte of bytes) {
    token += PASSWORD_CHARS[byte % PASSWORD_CHARS.length];
  }
  return `SmartMenu${token}!`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function passwordResetHtml(email: string, password: string, loginUrl: string) {
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const href = escapeHtml(loginUrl);
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
                  გამარჯობა, თქვენი Smart Menu ანგარიშის პაროლი განახლდა.
                </p>
                <p style="margin:0 0 8px;font-size:16px;line-height:1.6;">
                  ელფოსტა: <b>${safeEmail}</b>
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  დროებითი პაროლი: <b>${safePassword}</b>
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#5c564e;">
                  გთხოვთ შეხვიდეთ სისტემაში და შეცვალოთ პაროლი თქვენთვის მოსახერხებელზე.
                </p>
                <p style="margin:0;">
                  <a href="${href}" style="display:inline-block;background:#6d0808;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
                    პლატფორმაზე შესვლა
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

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const match = (data.users ?? []).find(
      (user) => normalizeStaffEmail(user.email) === email,
    );
    if (match?.id) return match.id;
    if ((data.users ?? []).length < 200) return null;
  }
  return null;
}

function resetPayload(body: {
  email?: string;
  password?: string;
  generate?: boolean;
}) {
  const email = normalizeStaffEmail(body.email);
  const provided = String(body.password ?? "").trim();
  const password =
    !provided || body.generate ? generateTempPassword() : provided;
  return { email, password };
}

function staffResetForbidden(
  actorRole: string | null | undefined,
  targetRole: string | undefined,
  email: string,
) {
  if (parseSuperAdminEmails().includes(email)) return true;
  if (targetRole === "owner") return true;
  return actorRole === "manager" && targetRole !== "waiter";
}

async function writeAuthPassword(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
  password: string,
) {
  const userId = await findAuthUserIdByEmail(supabase, email);
  if (!userId) {
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user?.id) {
      return created.error?.message ?? "Could not create the auth user.";
    }
    return null;
  }
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });
  return error?.message ?? null;
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;

  try {
    const { email, password } = resetPayload(
      (await request.json()) as {
        email?: string;
        password?: string;
        generate?: boolean;
      },
    );

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set on the server." },
        { status: 500 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const staff = await supabase
      .from("restaurant_staff")
      .select("id, email, role")
      .eq("restaurant_id", tenant.restaurant.id);

    if (staff.error) {
      return NextResponse.json({ error: staff.error.message }, { status: 500 });
    }

    const row = ((staff.data ?? []) as { email?: string; role?: string }[]).find(
      (item) => normalizeStaffEmail(item.email) === email,
    );
    if (!row) {
      return NextResponse.json(
        { error: "That person is not on this restaurant's staff." },
        { status: 404 },
      );
    }
    if (staffResetForbidden(tenant.staffRole, row.role, email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const writeError = await writeAuthPassword(supabase, email, password);
    if (writeError) {
      return NextResponse.json({ error: writeError }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const { error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Smart Menu: დროებითი პაროლი",
      html: passwordResetHtml(email, password, `${getPublicAppUrl()}/admin`),
    });
    if (emailError) throw emailError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
