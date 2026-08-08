/**
 * Minimal shell for unauthenticated routes (sign-in, invite signup, token links).
 * No public header, footer, or marketing chrome.
 */
export const GuestTemplate = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700 antialiased">
      {props.children}
    </div>
  );
};
