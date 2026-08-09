'use client';

import type { ShellCheckInCtaModel } from '@/libs/shell/shell-topbar.util';
import { Check, LogIn, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/libs/I18nNavigation';

type Props = {
  model: ShellCheckInCtaModel;
};

export function ShellCheckInCta({ model }: Props) {
  const t = useTranslations('AuthenticatedShell');

  if (model.kind === 'hidden') {
    return null;
  }

  const isAction = model.kind === 'check_in';
  const href = '/employee/home#check-in';

  let label: string;
  let Icon = LogIn;
  if (model.kind === 'checked_in') {
    label = t('checked_in_with_time', { time: model.timeLabel ?? '—' });
    Icon = Check;
  } else if (model.kind === 'checked_out') {
    label = t('checked_out');
    Icon = LogOut;
  } else {
    label = t('check_in');
  }

  return (
    <Link
      href={href}
      className={
        isAction
          ? 'inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800'
          : 'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100'
      }
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}
