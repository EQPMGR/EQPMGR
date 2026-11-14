// Where to send someone after they log in, e.g. a visitor who tapped "Get a
// quote" (/insurance) on eqpmgr.com before they had an account.
//
// Only same-site paths are allowed, so a crafted ?next= link can't bounce
// people to another website after login.

const STORAGE_KEY = 'eqpmgr.returnPath';

export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\\]/.test(raw)) return null;
  if (raw.startsWith('/login') || raw.startsWith('/verify-email')) return null;
  return raw;
}

/** Remembered across the sign-up email check (same browser only). */
export function rememberReturnPath(path: string | null) {
  try {
    if (path) window.localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Private mode or storage blocked: they'll land on the dashboard instead.
  }
}

/** The ?next= path, or one remembered at sign-up. Clears the remembered one. */
export function takeReturnPath(): string | null {
  const fromUrl = safeReturnPath(new URLSearchParams(window.location.search).get('next'));
  let stored: string | null = null;
  try {
    stored = safeReturnPath(window.localStorage.getItem(STORAGE_KEY));
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return fromUrl ?? stored;
}
