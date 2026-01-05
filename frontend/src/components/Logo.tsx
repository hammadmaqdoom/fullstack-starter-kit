import { Link } from '@/libs/I18nNavigation';

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <div className="flex size-8 items-center justify-center rounded-full bg-white">
        <div className="size-4 rounded-full bg-black" />
      </div>
    </Link>
  );
}

