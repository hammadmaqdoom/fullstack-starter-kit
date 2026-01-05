'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/libs/BetterAuth';

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  return (
    <button onClick={handleSignOut} type="button">
      {children}
    </button>
  );
}

