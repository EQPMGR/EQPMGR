import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
import { isAllowedAdminEmail } from '@/lib/admin-access';

export type AuthenticatedUser = { uid: string; email?: string; idToken: string };

type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Verifies the request's Supabase bearer token. Returns the user, or a 401
 * response to return as-is from the route handler.
 */
export async function requireUser(request: Request): Promise<AuthResult> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return { ok: false, response: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) };
  }

  try {
    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!decoded?.uid) {
      return { ok: false, response: NextResponse.json({ error: 'Invalid token.' }, { status: 401 }) };
    }
    return { ok: true, user: { uid: decoded.uid, email: decoded.email, idToken } };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token.' }, { status: 401 }) };
  }
}

/**
 * Like requireUser, but also requires the user's email to be on the admin
 * allowlist (src/lib/admin-access.ts). Returns 403 otherwise.
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const result = await requireUser(request);
  if (!result.ok) return result;

  if (!isAllowedAdminEmail(result.user.email)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }
  return result;
}
