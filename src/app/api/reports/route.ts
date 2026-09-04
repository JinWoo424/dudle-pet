import { z } from "zod";
import postgres from "postgres";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ facilityId: z.string().uuid(), reportType: z.enum(["CLOSED", "WRONG_PHONE", "WRONG_ADDRESS", "WRONG_HOURS", "WRONG_24H", "WRONG_SERVICE", "OTHER"]), message: z.string().trim().min(10).max(1500), contactEmail: z.union([z.literal(""), z.email()]).optional() });
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`report:${ip}`, 5, 60 * 60_000)) return new Response("Too many reports", { status: 429 });
  const form = await request.formData(); const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return new Response("요청 내용을 확인해 주세요.", { status: 400 });
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    try {
      await sql`INSERT INTO user_reports (facility_id, report_type, message, contact_email) VALUES (${parsed.data.facilityId}, ${parsed.data.reportType}, ${parsed.data.message}, ${parsed.data.contactEmail || null})`;
    } catch {
      return new Response("요청을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", { status: 503 });
    } finally {
      await sql.end();
    }
  }
  return Response.redirect(new URL(`/report?facility=${parsed.data.facilityId}&submitted=1`, request.url), 303);
}
