import { checkAllItems } from "@/lib/checker";

/**
 * Trigger a price check from an external scheduler. Authenticate with either
 * `x-cron-secret: $CRON_SECRET` or `Authorization: Bearer $CRON_SECRET`.
 */
async function handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await checkAllItems());
}

export { handler as GET, handler as POST };
