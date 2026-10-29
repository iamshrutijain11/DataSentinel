'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface MswProviderProps {
  children: ReactNode;
}

export function MswProvider({ children }: MswProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initMsw() {
      const shouldUseMocks =
        process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ||
        process.env.NODE_ENV === 'development' ||
        !process.env.NEXT_PUBLIC_API_URL;

      if (shouldUseMocks && typeof window !== 'undefined') {
        try {
          const { worker } = await import('@/mocks/browser');
          await worker.start({
            quiet: true,
          });
        } catch (err) {
          console.warn('MSW worker failed to start or already active:', err);
        }
      }
      setIsReady(true);
    }

    initMsw();
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide text-slate-400">
            Initializing DataSentinel Telemetry Engine...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
