'use client';

import type { ReactNode } from 'react';
import { PrimeReactProvider } from 'primereact/api';

export function PrimeProvider({ children }: { children: ReactNode }) {
  return (
    <PrimeReactProvider
      value={{
        ripple: true,
        inputStyle: 'outlined',
      }}
    >
      {children}
    </PrimeReactProvider>
  );
}
