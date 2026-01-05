import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-screen flex-col text-gray-700 antialiased">
      <Header />
      <div className="mx-auto w-full max-w-screen-md flex-1 px-1">
        <main>{props.children}</main>
      </div>
      <Footer />
    </div>
  );
};
