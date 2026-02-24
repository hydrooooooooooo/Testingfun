const SITE_URL = 'https://easyscrapy.com';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Easy',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    description: 'Plateforme de Social Media Analytics pour agences et professionnels.',
    sameAs: ['https://twitter.com/EasyScrapy'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@easyscrapy.com',
      contactType: 'customer service',
      availableLanguage: ['French', 'English'],
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Easy',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: 'Plateforme de Social Media Analytics : collecte de données Facebook, analyse IA, benchmark concurrentiel.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MGA',
      availability: 'https://schema.org/InStock',
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
