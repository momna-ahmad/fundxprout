'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'hsl(var(--card, 220 23% 13%))',
          border: '1px solid hsl(var(--border, 215 16% 22%))',
          color: 'hsl(var(--foreground, 0 0% 95%))',
          borderRadius: '16px',
          fontFamily: 'inherit',
        },
        classNames: {
          toast: 'font-sans',
        },
      }}
    />
  );
}
