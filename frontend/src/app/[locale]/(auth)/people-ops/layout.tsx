import { RequireRole } from '@/components/shared/RequireRole';

export default function PeopleOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole role="peopleOps">{children}</RequireRole>;
}
