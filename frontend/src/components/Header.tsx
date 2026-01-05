'use client';

import { useState } from 'react';
import { Link } from '@/libs/I18nNavigation';
import { Logo } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('RootLayout');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-4">
      <nav className="mx-auto max-w-7xl rounded-2xl bg-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Navigation Links */}
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              {t('home_link')}
            </Link>
            <Link
              href="/about/"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              {t('about_link')}
            </Link>
            <Link
              href="/features/"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              {t('features_link')}
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              Blog
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-white transition-colors hover:text-gray-300"
            >
              {t('sign_in_link')}
            </Link>
          </div>

          {/* Register Button and Locale Switcher */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <LocaleSwitcher className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <Link
              href="/sign-up"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              {t('sign_up_link')}
            </Link>

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
              href="/"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('home_link')}
            </Link>
            <Link
              href="/about/"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('about_link')}
            </Link>
            <Link
              href="/features/"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('features_link')}
            </Link>
            <Link
              href="/blog"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/sign-in"
              className="block text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('sign_in_link')}
            </Link>
            <div className="pt-2">
              <LocaleSwitcher className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

