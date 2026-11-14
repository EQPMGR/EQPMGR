import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { ServiceWorkerRegister } from '@/components/service-worker-register';


export const metadata: Metadata = {
  title: 'EQPMGR',
  description: "Know what's wearing out before it fails. Every part on your bike, tracked from your real rides.",
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'EQPMGR', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#6ec9c0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
