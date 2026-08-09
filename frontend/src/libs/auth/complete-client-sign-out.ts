/**
 * Post-sign-out navigation for App Router.
 *
 * Soft navigation alone keeps the previous RSC layout tree, so the locale
 * layout can still wrap pages in AuthenticatedTemplate after the session
 * cookie is cleared. Refresh forces getServerSession() to re-run and switch
 * to GuestTemplate.
 */
export async function completeClientSignOut(deps: {
  signOut: () => Promise<unknown>;
  replace: (href: string) => void;
  refresh: () => void;
}): Promise<void> {
  await deps.signOut();
  deps.replace('/sign-in');
  deps.refresh();
}
