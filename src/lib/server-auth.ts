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
 * For server actions: verifies a Supabase ID token passed from the client
 * (`user.getIdToken()`) and returns the user. Throws if it is missing or invalid.
 * Never trust a userId sent by the client; use the uid returned here.
 */
export async function verifyUserToken(idToken: string | null | undefined): Promise<AuthenticatedUser> {
  if (!idToken) throw new Error('You must be signed in to do that.');

  const auth = await getServerAuth();
  const decoded = await auth.verifyIdToken(idToken, true).catch(() => null);
  if (!decoded?.uid) throw new Error('Your session has expired. Please sign in again.');

  return { uid: decoded.uid, email: decoded.email, idToken };
}

/**
 * For server actions: like verifyUserToken, but also requires the user's email
 * to be on the admin allowlist (src/lib/admin-access.ts).
 */
export async function verifyAdminToken(idToken: string | null | undefined): Promise<AuthenticatedUser> {
  const user = await verifyUserToken(idToken);
  if (!isAllowedAdminEmail(user.email)) throw new Error('Admin access required.');
  return user;
}

/**
 * For route handlers: verifies the request's bearer token. Returns the user, or
 * a 401 response to return as-is.
 */
export async function requireUser(request: Request): Promise<AuthResult> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return { ok: false, response: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) };
  }

  try {
    return { ok: true, user: await verifyUserToken(idToken) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token.' }, { status: 401 }) };
  }
}

/**
 * For route handlers: like requireUser, but also requires the user's email to
 * be on the admin allowlist. Returns 403 otherwise.
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const result = await requireUser(request);
  if (!result.ok) return result;

  if (!isAllowedAdminEmail(result.user.email)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }
  return result;
}
