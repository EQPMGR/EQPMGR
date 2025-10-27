
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the main authenticated entry point.
  // The (app) layout will handle redirecting to /login if not authenticated.
  redirect('/equipment');
}
