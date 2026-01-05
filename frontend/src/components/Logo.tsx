import { Link } from '@/libs/I18nNavigation';

interface LogoProps {
  href?: string;
  className?: string;
}

export function Logo({ href = '/', className = 'flex items-center' }: LogoProps) {
  return (
    <Link href={href} className={className}>
      <div className="flex size-8 items-center justify-center rounded-full bg-white">
        <div className="size-4 rounded-full bg-black" />
      </div>
    </Link>
  );
}

