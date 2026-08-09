'use client';

import type { ButtonHTMLAttributes } from 'react';
import { authClient } from '@/libs/BetterAuth';
import { completeClientSignOut } from '@/libs/auth/complete-client-sign-out';
import { useRouter } from '@/libs/I18nNavigation';

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function SignOutButton({
  children,
  className,
  onClick,
  type = 'button',
  ...rest
}: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    await completeClientSignOut({
      signOut: () => authClient.signOut(),
      replace: href => router.replace(href),
      refresh: () => router.refresh(),
    });
  };

  return (
    <button
      {...rest}
      className={className}
      onClick={handleSignOut}
      type={type}
    >
      {children}
    </button>
  );
}
