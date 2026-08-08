/**
 * @deprecated Prefer GuestTemplate for unauthenticated routes.
 * Kept for Storybook / unit tests that still import this shell.
 */
export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-screen flex-col text-gray-700 antialiased">
      <div className="mx-auto w-full max-w-screen-md flex-1 px-1">
        <main>{props.children}</main>
      </div>
    </div>
  );
};
