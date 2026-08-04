'use client';

import type { LucideIcon } from 'lucide-react';
import type { ShellLayout } from '@/libs/api/shell';
import { CalendarDays, FileSignature, Home, Inbox, Receipt, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { Link, usePathname } from '@/libs/I18nNavigation';

type TabItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

function tabsForLayout(layout: ShellLayout): TabItem[] {
  if (layout === 'contractor') {
    return [
      {
        href: '/contractor/dashboard',
        labelKey: 'home',
        icon: Home,
        match: (p) => p.startsWith('/contractor/dashboard'),
      },
      {
        href: '/contractor/invoices',
        labelKey: 'invoices',
        icon: Receipt,
        match: (p) => p.startsWith('/contractor/invoices'),
      },
      {
        href: '/contractor/documents',
        labelKey: 'documents',
        icon: FileSignature,
        match: (p) => p.startsWith('/contractor/documents'),
      },
      {
        href: '/contractor/profile',
        labelKey: 'profile',
        icon: User,
        match: (p) => p.startsWith('/contractor/profile'),
      },
    ];
  }

  if (
    layout === 'people_ops'
    || layout === 'admin'
    || layout === 'finance'
  ) {
    return [];
  }

  return [
    {
      href: '/employee/home',
      labelKey: 'home',
      icon: Home,
      match: (p) => p === '/employee/home' || p.startsWith('/employee/home/'),
    },
    {
      href: '/hub',
      labelKey: 'hub',
      icon: Inbox,
      match: (p) => p === '/hub' || p.startsWith('/hub/'),
    },
    {
      href: '/employee/calendar',
      labelKey: 'calendar',
      icon: CalendarDays,
      match: (p) => p === '/employee/calendar' || p.startsWith('/employee/calendar/'),
    },
    {
      href: '/employee/profile',
      labelKey: 'profile',
      icon: User,
      match: (p) => p.startsWith('/employee/profile') || p.startsWith('/dashboard/user-profile'),
    },
  ];
}

export function MobileTabBar() {
  const t = useTranslations('MobileTabBar');
  const pathname = usePathname();
  const { shell, isLoading } = usePolarisShell();

  if (isLoading || !shell) {
    return null;
  }

  const tabs = tabsForLayout(shell.primaryLayout);
  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t('aria_label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex h-14 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={`size-5 ${active ? 'text-gray-900' : 'text-gray-500'}`}
                  aria-hidden
                />
                <span>{t(tab.labelKey as 'home')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
