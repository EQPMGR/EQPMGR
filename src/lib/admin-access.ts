export const ADMIN_ALLOWED_EMAILS = ['sagelovestheforest@gmail.com'];

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_ALLOWED_EMAILS.some((allowed) => allowed.toLowerCase() === email.toLowerCase());
}
