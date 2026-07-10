'use client';

import type { LucideIcon } from 'lucide-react';
import { FileSignature, Home, Receipt, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/libs/I18nNavigation';

type ContractorTab = {
  href: string;
  labelKey: 'tab_home' | 'tab_invoices' | 'tab_documents' | 'tab_me';
  icon: LucideIcon;
};

const TABS: ContractorTab[] = [
  { href: '/contractor/dashboard', labelKey: 'tab_home', icon: Home },
  { href: '/contractor/invoices', labelKey: 'tab_invoices', icon: Receipt },
  { href: '/contractor/documents', labelKey: 'tab_documents', icon: FileSignature },
  { href: '/contractor/profile', labelKey: 'tab_me', icon: User },
];

/** Enforces the "exactly four tabs" contractor portal shell (UX §6.5). */
export function ContractorTabs() {
  const t = useTranslations('ContractorPortal');
  const pathname = usePathname();

  return (
    <nav aria-label={t('tabs_aria_label')} className="-mx-1 overflow-x-auto border-b border-gray-200">
      <ul className="flex min-w-max gap-1 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
