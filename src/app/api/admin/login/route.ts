import { createAdminSession, verifyPassword } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`admin:${ip}`, 5, 15 * 60_000)) return new Response("Too many attempts", { status: 429 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return new Response("Invalid origin", { status: 403 });
  const form = await request.formData();
  const email = String(form.get("email") ?? ""); const password = String(form.get("password") ?? "");
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH || email !== process.env.ADMIN_EMAIL || !verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) return new Response("로그인 정보가 올바르지 않습니다.", { status: 401 });
  const response = Response.redirect(new URL("/admin", request.url), 303);
  response.headers.append("Set-Cookie", `dudle_admin=${createAdminSession(email)}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}

