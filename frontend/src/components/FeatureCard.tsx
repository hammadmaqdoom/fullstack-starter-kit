interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  bgColor?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  bgColor = 'bg-blue-100',
}: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`mb-4 flex size-12 items-center justify-center rounded-lg ${bgColor}`}
      >
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

