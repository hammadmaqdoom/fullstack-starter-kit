'use client';

import { useState } from 'react';
import { Link } from '@/libs/I18nNavigation';
import { Logo } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { SignOutButton } from './auth/SignOutButton';
import { useSession } from '@/libs/BetterAuth';
import { LogOut } from 'lucide-react';

export function AuthenticatedNavbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-4">
      <nav className="mx-auto max-w-7xl rounded-2xl bg-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/dashboard" />
          </div>

          {/* Navigation Links - Different for authenticated users */}
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/user-profile"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              Profile
            </Link>
            <Link
              href="/dashboard/security"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              Security
            </Link>
            <Link
              href="/dashboard/sessions"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              Sessions
            </Link>
            {session?.user?.role === 'Admin' && (
              <Link
                href="/admin/cms/contents"
                className="text-sm font-medium text-white transition-colors hover:text-gray-300"
              >
                CMS Admin
              </Link>
            )}
          </div>

          {/* User Menu and Actions */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            {session?.user && (
              <div className="hidden items-center gap-3 md:flex">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                    {session.user.name?.[0]?.toUpperCase() || session.user.email[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {session.user.name || session.user.email}
                  </span>
                </div>
              </div>
            )}

            {/* Locale Switcher */}
            <div className="hidden md:block">
              <LocaleSwitcher className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            {/* Sign Out Button */}
            <SignOutButton>
              <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </div>
            </SignOutButton>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mt-4 space-y-2 border-t border-gray-700 pt-4 md:hidden">
            <Link
              href="/dashboard"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/user-profile"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/dashboard/security"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Security
            </Link>
            <Link
              href="/dashboard/sessions"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sessions
            </Link>
            {session?.user?.role === 'Admin' && (
              <Link
                href="/admin/cms/contents"
                className="block text-sm font-medium text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                CMS Admin
              </Link>
            )}
            {session?.user && (
              <div className="flex items-center gap-2 border-t border-gray-700 pt-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {session.user.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-400">{session.user.email}</div>
                </div>
              </div>
            )}
            <div className="pt-2">
              <LocaleSwitcher className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="pt-2">
              <SignOutButton>
                <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </div>
              </SignOutButton>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

