interface HreflangTag {
  locale: string;
  url: string;
}

interface HreflangProps {
  tags: HreflangTag[];
  defaultLocale?: string;
  defaultUrl?: string;
}

export function Hreflang({ tags, defaultLocale, defaultUrl }: HreflangProps) {
  return (
    <>
      {tags.map(tag => (
        <link
          key={tag.locale}
          rel="alternate"
          hrefLang={tag.locale}
          href={tag.url}
        />
      ))}
      {defaultLocale && defaultUrl && (
        <link rel="alternate" hrefLang="x-default" href={defaultUrl} />
      )}
    </>
  );
}

