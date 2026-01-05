import { createNavigation } from 'next-intl/navigation';
import { routing } from './I18nRouting';

export const { usePathname, useRouter, redirect, Link } = createNavigation(routing);
