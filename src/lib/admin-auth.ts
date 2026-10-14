import { getSupabaseAdmin, getSupabasePublic } from "./supabase";
import { verifyContentAdmin } from "./admin-authorization";

export async function authenticateContentAdmin(request: Request) {
  const auth = await verifyContentAdmin(request, getSupabasePublic());
  if ("error" in auth) return auth;
  // Instantiate the privileged client only after authorization succeeds.
  const adminClient = getSupabaseAdmin();
  if (!adminClient) return { error: "Admin service is not configured", status: 503 as const };
  return { userId: auth.userId, adminClient };
}
