'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FileSignature,
  FileText,
  Gift,
  HelpCircle,
  Home,
  Image,
  Inbox,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  MoreVertical,
  Plane,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Target,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Logo } from '@/components/Logo';
import { useSession } from '@/libs/BetterAuth';
import { usePolarisNavAccess } from '@/libs/hooks/usePolarisNavAccess';
import { Link, usePathname } from '@/libs/I18nNavigation';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  locked?: boolean;
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
      {item.badge !== undefined && (
        <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
          {item.badge}
        </span>
      )}
      {item.locked && (
        <Lock className="size-3.5 shrink-0 text-gray-400" aria-hidden />
      )}
    </Link>
  );
}

function SidebarPanel({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const t = useTranslations('AppSidebar');
  const pathname = usePathname();
  const { data: session } = useSession();
  const navAccess = usePolarisNavAccess();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === 'Admin';

  const primaryNav: NavItem[] = [
    { href: '/dashboard', label: t('home_link'), icon: Home, exact: true },
    { href: '/hub', label: t('hub_link'), icon: Inbox },
    { href: '/dashboard/user-profile', label: t('profile_link'), icon: User },
    { href: '/dashboard/notifications', label: t('notifications_link'), icon: Bell },
    { href: '/dashboard/security', label: t('security_link'), icon: Shield },
    { href: '/dashboard/sessions', label: t('sessions_link'), icon: Smartphone },
  ];

  const peopleOpsNav: NavItem[] = [
    {
      href: '/people-ops/dashboard',
      label: t('hr_dashboard_link'),
      icon: LayoutDashboard,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/workers',
      label: t('workers_link'),
      icon: Users,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/pre-boarding',
      label: t('pre_boarding_link'),
      icon: Send,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/onboarding',
      label: t('onboarding_link'),
      icon: UserPlus,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/templates',
      label: t('templates_link'),
      icon: FileText,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/separations',
      label: t('separations_link'),
      icon: DoorOpen,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/policies',
      label: t('policies_link'),
      icon: ClipboardList,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/leave',
      label: t('leave_admin_link'),
      icon: CalendarDays,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/performance',
      label: t('performance_link'),
      icon: Target,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/performance/okrs',
      label: t('okrs_link'),
      icon: Target,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/letterheads',
      label: t('letterheads_link'),
      icon: FileText,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/people-ops/documents/register',
      label: t('document_register_link'),
      icon: FileText,
      locked: !navAccess.peopleOps,
    },
    {
      href: '/admin/setup',
      label: t('setup_link'),
      icon: Settings,
      locked: !navAccess.peopleOps,
    },
  ];

  const employeeNav: NavItem[] = [
    {
      href: '/employee/home',
      label: t('employee_home_link'),
      icon: Home,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/profile',
      label: t('employee_profile_link'),
      icon: User,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/directory',
      label: t('employee_directory_link'),
      icon: Search,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/leave',
      label: t('employee_leave_link'),
      icon: CalendarDays,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/calendar',
      label: t('employee_calendar_link'),
      icon: CalendarDays,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/policies',
      label: t('employee_policies_link'),
      icon: ClipboardList,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/documents',
      label: t('employee_documents_link'),
      icon: FileSignature,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/performance',
      label: t('employee_performance_link'),
      icon: Target,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/payslips',
      label: t('employee_payslips_link'),
      icon: Wallet,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/expenses',
      label: t('employee_expenses_link'),
      icon: Receipt,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/travel',
      label: t('employee_travel_link'),
      icon: Plane,
      locked: !navAccess.employee,
    },
    {
      href: '/employee/help',
      label: t('employee_help_link'),
      icon: HelpCircle,
      locked: !navAccess.employee,
    },
  ];

  const managerNav: NavItem[] = [
    {
      href: '/manager/cockpit',
      label: t('manager_cockpit_link'),
      icon: Briefcase,
      locked: !navAccess.manager,
    },
    {
      href: '/manager/calendar',
      label: t('manager_calendar_link'),
      icon: CalendarDays,
      locked: !navAccess.manager,
    },
    {
      href: '/manager/performance',
      label: t('manager_performance_link'),
      icon: Target,
      locked: !navAccess.manager,
    },
  ];

  const financeNav: NavItem[] = [
    {
      href: '/finance/pay-runs',
      label: t('finance_pay_runs_link'),
      icon: Wallet,
      locked: !navAccess.finance,
    },
    {
      href: '/finance/benefits',
      label: t('finance_benefits_link'),
      icon: Gift,
      locked: !navAccess.finance,
    },
    {
      href: '/finance/statutory-rates',
      label: t('finance_statutory_rates_link'),
      icon: ShieldCheck,
      locked: !navAccess.finance,
    },
    {
      href: '/finance/contractor-payments',
      label: t('finance_contractor_payments_link'),
      icon: Receipt,
      locked: !navAccess.finance,
    },
  ];

  const contractorNav: NavItem[] = [
    {
      href: '/contractor/dashboard',
      label: t('contractor_home_link'),
      icon: Home,
      locked: !navAccess.contractor,
    },
    {
      href: '/contractor/invoices',
      label: t('contractor_invoices_link'),
      icon: Receipt,
      locked: !navAccess.contractor,
    },
    {
      href: '/contractor/documents',
      label: t('contractor_documents_link'),
      icon: FileSignature,
      locked: !navAccess.contractor,
    },
    {
      href: '/contractor/profile',
      label: t('contractor_profile_link'),
      icon: User,
      locked: !navAccess.contractor,
    },
  ];

  const adminNav: NavItem[] = [
    { href: '/admin/cms/contents', label: t('cms_contents'), icon: FileText },
    { href: '/admin/cms/media', label: t('cms_media'), icon: Image },
    { href: '/admin/cms/seo', label: t('cms_seo'), icon: Search },
    { href: '/admin/cms/analytics', label: t('cms_analytics'), icon: BarChart3 },
  ];

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

  return (
    <div className="flex h-full flex-col">
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Logo href="/dashboard" className="shrink-0" />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-gray-50"
          aria-label={t('workspace_menu')}
        >
          <span className="truncate text-sm font-semibold text-gray-900">
            {t('workspace_name')}
          </span>
          <ChevronDown className="size-4 shrink-0 text-gray-500" aria-hidden />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-3 pb-3">
        <button
          type="button"
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

      {/* Primary navigation */}
      <nav aria-label={t('main_navigation')} className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {primaryNav.map(item => (
            <li key={item.href}>
              <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        {!navAccess.isLoading && navAccess.peopleOps && (
          <>
            <p className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {t('section_people_ops')}
            </p>
            <ul className="space-y-0.5">
              {peopleOpsNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </>
        )}

        {!navAccess.isLoading && (
          <>
            <p className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {t('section_employee')}
            </p>
            <ul className="space-y-0.5">
              {employeeNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>

            <p className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {t('section_manager')}
            </p>
            <ul className="space-y-0.5">
              {managerNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>

            <p className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {t('section_finance')}
            </p>
            <ul className="space-y-0.5">
              {financeNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>

            <p className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {t('section_contractor')}
            </p>
            <ul className="space-y-0.5">
              {contractorNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </>
        )}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-gray-100" role="separator" />
            <ul className="space-y-0.5">
              {adminNav.map(item => (
                <li key={item.href}>
                  <SidebarNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-gray-100 px-3 pt-3 pb-3">
        {/* Onboarding card */}
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-start gap-2">
            <Loader2 className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900">{t('tour_title')}</p>
              <p className="mt-0.5 text-[11px] font-medium text-blue-600">
                {t('tour_progress', { completed: 2, total: 7 })}
              </p>
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-[28.5%] rounded-full bg-blue-600" />
          </div>
        </div>

        <Link
          href="https://github.com/hammadmaqdoom/fullstack-starter-kit/releases"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="mb-3 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <Megaphone className="size-[18px] shrink-0 text-gray-500" aria-hidden />
          {t('changelog_link')}
        </Link>

        {/* User profile */}
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
                onClick={() => setUserMenuOpen(open => !open)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label={t('user_menu')}
                aria-expanded={userMenuOpen}
              >
                <MoreVertical className="size-4" aria-hidden />
              </button>
            </div>

            {userMenuOpen && (
              <div className="absolute right-0 bottom-full left-0 z-10 mb-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <LocaleSwitcher className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700" />
                </div>
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
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
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
        <SidebarPanel onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
