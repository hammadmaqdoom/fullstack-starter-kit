/**
 * Pass-through root layout.
 *
 * next-intl keeps `<html>` / `<body>` in `app/[locale]/layout.tsx` so `lang`
 * can follow the active locale. Without this file, Next.js injects its
 * built-in DefaultLayout (`<html>` with no `lang`), which hydrates against
 * the locale layout's `<html lang="en">` and throws a mismatch warning.
 *
 * @see https://next-intl.dev/docs/environments/error-files
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
