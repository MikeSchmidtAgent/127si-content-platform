type VerifiedUser = { id: string; app_metadata?: Record<string, unknown>; is_anonymous?: boolean };
type AuthClient = { auth: { getUser(token: string): Promise<{ data: { user: VerifiedUser | null }; error: unknown }> } };

// getUser asks Auth for current, server-owned metadata; do not authorize from
// client-editable user_metadata or locally decoded JWT claims.
export type AuthorizationFailure = { error: string; status: 401 | 403 | 503 };

export async function verifyContentAdmin(request: Request, client: AuthClient | null): Promise<AuthorizationFailure | { userId: string }> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return { error: "Authentication required", status: 401 as const };
  if (!client) return { error: "Admin service is not configured", status: 503 as const };
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return { error: "Invalid authentication", status: 401 as const };
    if (data.user.is_anonymous || data.user.app_metadata?.content_admin !== true) {
      return { error: "Content administrator access required", status: 403 as const };
    }
    return { userId: data.user.id };
  } catch {
    return { error: "Authentication service unavailable", status: 503 as const };
  }
}
