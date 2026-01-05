'use client';

import { Link } from '@/libs/I18nNavigation';
import { Logo } from './Logo';
import { useTranslations } from 'next-intl';
import { AppConfig } from '@/utils/AppConfig';
import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const t = useTranslations('Footer');

  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'GitHub',
      href: 'https://github.com/hammadmaqdoom/fullstack-starter-kit.git',
      icon: Github,
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com',
      icon: Twitter,
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com',
      icon: Linkedin,
    },
  ];

  const productLinks = [
    { label: t('features'), href: '/features' },
    { label: t('pricing'), href: '/pricing' },
    { label: t('security'), href: '/security' },
    { label: t('changelog'), href: '/changelog' },
  ];

  const resourcesLinks = [
    { label: t('documentation'), href: '/docs' },
    { label: t('api_reference'), href: '/api' },
    { label: t('blog'), href: '/blog' },
    { label: t('support'), href: '/support' },
  ];

  const legalLinks = [
    { label: t('privacy_policy'), href: '/privacy' },
    { label: t('terms_of_service'), href: '/terms' },
    { label: t('cookie_policy'), href: '/cookies' },
  ];

  return (
    <footer className="border-t border-gray-800 bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Column */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo />
            </div>
            <p className="mb-6 text-sm text-gray-400">
              {t('tagline')}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 transition-all duration-200 hover:scale-110 hover:text-white"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('product')}
            </h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('resources')}
            </h3>
            <ul className="space-y-3">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('legal')}
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-400">
              © {currentYear} {AppConfig.name}. {t('all_rights_reserved')}
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

