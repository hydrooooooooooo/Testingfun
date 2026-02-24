export const BUSINESS_SECTORS = [
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'marketing-digital', label: 'Marketing digital' },
  { value: 'agence-communication', label: 'Agence de communication' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'finance-banque', label: 'Finance & Banque' },
  { value: 'tourisme-hotellerie', label: 'Tourisme & Hôtellerie' },
  { value: 'education', label: 'Éducation' },
  { value: 'media-presse', label: 'Média & Presse' },
  { value: 'technologie-saas', label: 'Technologie / SaaS' },
  { value: 'sante', label: 'Santé' },
  { value: 'ong-association', label: 'ONG / Association' },
  { value: 'administration-publique', label: 'Administration publique' },
  { value: 'autre', label: 'Autre' },
] as const;

export const COMPANY_SIZES = [
  { value: 'solo', label: 'Solo / Freelance' },
  { value: '2-10', label: '2-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-1000', label: '201-1000' },
  { value: '1000+', label: '1000+' },
] as const;

export const BUSINESS_SECTOR_VALUES = BUSINESS_SECTORS.map((s) => s.value);
export const COMPANY_SIZE_VALUES = COMPANY_SIZES.map((s) => s.value);
