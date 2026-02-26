import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Easy';
const SITE_URL = 'https://easyscrapy.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  locale?: 'fr_FR' | 'en_US';
  alternatePath?: string;
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
}

export default function SEOHead({
  title,
  description,
  path,
  locale = 'fr_FR',
  alternatePath,
  jsonLd,
  noindex = false,
}: SEOHeadProps) {
  const canonicalUrl = `${SITE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;
  const alternateLocale = locale === 'fr_FR' ? 'en_US' : 'fr_FR';

  return (
    <Helmet>
      <html lang={locale === 'fr_FR' ? 'fr' : 'en'} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={alternateLocale} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />

      {/* hreflang */}
      <link rel="alternate" hrefLang={locale === 'fr_FR' ? 'fr' : 'en'} href={canonicalUrl} />
      {alternatePath && (
        <link
          rel="alternate"
          hrefLang={locale === 'fr_FR' ? 'en' : 'fr'}
          href={`${SITE_URL}${alternatePath}`}
        />
      )}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* JSON-LD */}
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
