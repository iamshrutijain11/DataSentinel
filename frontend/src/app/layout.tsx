import type { Metadata } from 'next';
import './globals.css';
import { MswProvider } from '@/components/providers/MswProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'DataSentinel 2.0 | Enterprise Cybersecurity Analytics',
  description: 'AI-Powered Threat Detection & Autonomous Investigation Dashboard for Nebius × NVIDIA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-cyan-500 selection:text-slate-950">
        <MswProvider>
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
