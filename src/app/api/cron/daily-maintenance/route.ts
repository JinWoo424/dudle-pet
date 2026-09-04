import { timingSafeEqual } from "node:crypto";

function equal(a: string, b: string) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !equal(supplied, expected)) return new Response("Unauthorized", { status: 401 });
  return Response.json({ status: "accepted", sources: { hospital: "pending", pharmacy: "pending", funeral: "pending" } });
}

