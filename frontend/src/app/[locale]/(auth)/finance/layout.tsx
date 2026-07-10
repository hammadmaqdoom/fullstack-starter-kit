import { RequireRole } from '@/components/shared/RequireRole';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole role="finance">{children}</RequireRole>;
}
