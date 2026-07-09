import { AuthenticatedShell } from '@/components/AuthenticatedShell';

/**
 * Template for authenticated users
 *
 * Features:
 * - Minimal condensed left sidebar navigation
 * - Full-width main content area
 * - No footer
 */
export const AuthenticatedTemplate = (props: {
  children: React.ReactNode;
}) => {
  return <AuthenticatedShell>{props.children}</AuthenticatedShell>;
};
