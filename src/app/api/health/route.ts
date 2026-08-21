import { checkApplicationHealth } from "@/server/monitoring/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const health = checkApplicationHealth();

  return Response.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
