/* eslint-disable react-dom/no-unsafe-target-blank */
import Image from 'next/image';

const sponsors = [
  {
    name: 'Digitaro',
    href: 'https://digitaro.co',
    image: '/assets/images/digitaro-logo-dark.png',
    alt: 'Digitaro – Full-service technology company specializing in design, development, and consulting',
  },
];

export const Sponsors = () => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {sponsors.map(sponsor => (
      <a
        key={sponsor.name}
        href={sponsor.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center rounded-xl border border-gray-200 bg-white p-8 transition-all hover:border-gray-300 hover:shadow-lg"
      >
        <Image
          src={sponsor.image}
          alt={sponsor.alt}
          width={200}
          height={80}
          className="max-h-20 w-auto object-contain transition-opacity group-hover:opacity-80"
        />
      </a>
    ))}
  </div>
);
