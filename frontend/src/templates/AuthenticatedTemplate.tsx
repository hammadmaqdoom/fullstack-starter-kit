import { AuthenticatedNavbar } from '@/components/AuthenticatedNavbar';

/**
 * Template for authenticated users
 * 
 * Features:
 * - Custom navbar with user-specific navigation
 * - No footer (as requested)
 * - Clean, focused layout for logged-in users
 */
export const AuthenticatedTemplate = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-screen flex-col text-gray-700 antialiased">
      <AuthenticatedNavbar />
      <div className="mx-auto w-full max-w-screen-md flex-1 px-1">
        <main>{props.children}</main>
      </div>
      {/* No footer for authenticated users */}
    </div>
  );
};

