'use client';

import { Link } from '@/libs/I18nNavigation';
import { CalendarDays, FileText, Inbox, Palmtree, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SHORTCUTS = [
  { href: '/employee/leave', labelKey: 'shortcut_leave' as const, icon: Palmtree },
  { href: '/employee/calendar', labelKey: 'shortcut_calendar' as const, icon: CalendarDays },
  { href: '/hub', labelKey: 'shortcut_hub' as const, icon: Inbox },
  { href: '/employee/documents', labelKey: 'shortcut_documents' as const, icon: FileText },
  { href: '/employee/payslips', labelKey: 'shortcut_payslips' as const, icon: Wallet },
];

export function HomeShortcuts() {
  const t = useTranslations('EmployeeHome');

  return (
    <section aria-labelledby="shortcuts-heading">
      <h2 id="shortcuts-heading" className="text-sm font-semibold text-gray-900">
        {t('shortcuts_section')}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SHORTCUTS.map(({ href, labelKey, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Icon className="size-4 shrink-0 text-gray-500" aria-hidden />
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
