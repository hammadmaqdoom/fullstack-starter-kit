'use client';

import type { LucideIcon } from 'lucide-react';
import type { ShellModuleItem } from '@/libs/api/shell';
import {
  ChevronDown,
  LogOut,
  MoreVertical,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Logo } from '@/components/Logo';
import { ShellSetupCard } from '@/components/nav/ShellSetupCard';
import { shellNavIcon } from '@/components/nav/shell-nav.icons';
import { useSession } from '@/libs/BetterAuth';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { Link, usePathname } from '@/libs/I18nNavigation';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

function getInitials(name?: string | null, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
    }
    return name[0]?.toUpperCase() ?? 'U';
  }
  return email?.[0]?.toUpperCase() ?? 'U';
}

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function toNavItem(
  module: ShellModuleItem,
  t: (key: string) => string,
): NavItem {
  return {
    href: module.href,
    label: t(module.labelKey),
    icon: shellNavIcon(module.id),
    exact: module.id === 'home' || module.id === 'hr_dashboard',
  };
}

function SidebarNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
        active
          ? 'font-semibold text-gray-900'
          : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {active && (
        <span
          className="absolute top-1/2 -left-3 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gray-900"
          aria-hidden
        />
      )}
      <Icon
        className={`size-[18px] shrink-0 ${active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function NavSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="h-8 animate-pulse rounded-md bg-gray-100" />
      ))}
    </ul>
  );
}

function SidebarPanel({
  onNavigate,
  onOpenCommandPalette,
}: {
  onNavigate?: () => void;
  onOpenCommandPalette?: () => void;
}) {
  const t = useTranslations('AppSidebar');
  const pathname = usePathname();
  const { data: session } = useSession();
  const { shell, isLoading } = usePolarisShell();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const modules = shell?.modules ?? [];
    const groups = new Map<string, ShellModuleItem[]>();
    for (const module of modules) {
      const list = groups.get(module.group) ?? [];
      list.push(module);
      groups.set(module.group, list);
    }
    return groups;
  }, [shell?.modules]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = session?.user?.name || session?.user?.email || 'User';
  const email = session?.user?.email ?? '';
  const initials = getInitials(session?.user?.name, session?.user?.email);
  const homeHref = shell?.homePath ?? '/dashboard';

  const sectionOrder = ['primary', 'people_ops', 'finance', 'more'];
  const orderedGroups = [
    ...sectionOrder.filter((g) => grouped.has(g)),
    ...[...grouped.keys()].filter((g) => !sectionOrder.includes(g)),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Logo href={homeHref} className="shrink-0" />
        <div className="min-w-0 flex-1 px-1">
          <span className="truncate text-sm font-semibold text-gray-900">
            {t('workspace_name')}
          </span>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 text-[13px] text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50"
          aria-label={t('quick_actions')}
        >
          <Search className="size-3.5 shrink-0" aria-hidden />
          <span className="flex-1 text-left">{t('quick_actions')}</span>
          <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-medium text-gray-400">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav aria-label={t('main_navigation')} className="flex-1 overflow-y-auto px-3">
        {isLoading || !shell ? (
          <NavSkeleton />
        ) : (
          orderedGroups.map((group) => {
            const items = (grouped.get(group) ?? []).map((module) =>
              toNavItem(module, (key) => t(key as 'home_link')),
            );

            if (group === 'more') {
              return (
                <div key={group} className="mt-4">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((open) => !open)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase hover:bg-gray-50"
                    aria-expanded={moreOpen}
                  >
                    <span className="flex-1 text-left">{t('section_more')}</span>
                    <ChevronDown
                      className={`size-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {moreOpen && (
                    <ul className="mt-1 space-y-0.5">
                      {items.map((item) => (
                        <li key={item.href}>
                          <SidebarNavLink
                            item={item}
                            pathname={pathname}
                            onNavigate={onNavigate}
                          />
                        </li>
                      ))}
                      {shell.secondaryLayouts.map((secondary) => (
                        <li key={secondary.layout}>
                          <SidebarNavLink
                            item={{
                              href: secondary.homePath,
                              label: t(secondary.labelKey as 'switch_people_ops'),
                              icon: shellNavIcon('hr_dashboard'),
                            }}
                            pathname={pathname}
                            onNavigate={onNavigate}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }

            return (
              <div key={group} className={group === 'primary' ? '' : 'mt-4'}>
                {group !== 'primary' && (
                  <p className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                    {t(`section_${group}` as 'section_people_ops')}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={`${group}-${item.href}`}>
                      <SidebarNavLink
                        item={item}
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </nav>

      <div className="mt-auto border-t border-gray-100 px-3 pt-3 pb-3">
        {shell?.setup?.showCard && (
          <ShellSetupCard setup={shell.setup} onNavigate={onNavigate} />
        )}

        {session?.user && (
          <div ref={userMenuRef} className="relative">
            <div className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-gray-50">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-gray-900">{displayName}</p>
                <p className="truncate text-[11px] text-gray-500">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label={t('user_menu')}
                aria-expanded={userMenuOpen}
              >
                <MoreVertical className="size-4" aria-hidden />
              </button>
            </div>

            {userMenuOpen && (
              <div className="absolute right-0 bottom-full left-0 z-10 mb-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <SignOutButton>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LogOut className="size-4" aria-hidden />
                    {t('sign_out')}
                  </button>
                </SignOutButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  onOpenCommandPalette,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onOpenCommandPalette?: () => void;
}) {
  const t = useTranslations('AppSidebar');

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onMobileClose}
          aria-label={t('close_menu')}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute top-3 right-3 rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label={t('close_menu')}
        >
          <X className="size-4" aria-hidden />
        </button>
        <SidebarPanel
          onNavigate={onMobileClose}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </aside>
    </>
  );
}
