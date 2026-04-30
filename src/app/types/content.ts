export interface ProductItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  cover: string;
  order: number;
  published: boolean;
  tags?: string[];
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FinanceSolutionItem {
  id: string;
  title: string;
  summary: string;
  image?: string;
  order: number;
  published: boolean;
}

export interface CmsNavItem {
  key?: string;
  title?: string;
  href?: string;
  order?: number;
  published?: boolean;
  translation?: CmsTranslationMeta;
}

export interface CmsFinanceItem {
  key?: string;
  title?: string;
  summary?: string;
  image?: string;
  imageFocus?: string;
  order?: number;
  published?: boolean;
}

export interface CmsProductItem {
  key?: string;
  category?: string;
  title?: string;
  summary?: string;
  cover?: string;
  coverFocus?: string;
  ctaHref?: string;
  order?: number;
  published?: boolean;
}

export interface CmsCardItem {
  pageKey?: "home" | "about" | "products" | "finance" | "solutions" | "contact";
  key?: string;
  title?: string;
  summary?: string;
  image?: string;
  imageFocus?: string;
  ctaText?: string;
  ctaHref?: string;
  order?: number;
  published?: boolean;
  translation?: CmsTranslationMeta;
}

export interface CmsTranslationMeta {
  mode?: "auto" | "manual_locked";
  sourceHash?: string;
  status?: "synced" | "outdated" | "error";
  lastTranslatedAt?: string;
}

export interface CmsMetricItem {
  value?: string;
  unit?: string;
  desc?: string;
}

export interface CmsBottomListItem {
  title?: string;
  summary?: string;
  order?: number;
}

export interface CmsContactInfo {
  show?: boolean;
  title?: string;
  addressLine1?: string;
  addressLine2?: string;
  email?: string;
  phone?: string;
}

export interface CmsLegacyConditionalSection<T extends object> {
  discriminant?: boolean;
  value?: T;
}

export type CmsSectionToggle<T extends object> = T & {
  show?: boolean;
  discriminant?: boolean;
  value?: T;
};

export interface HomeMetricItem {
  value: string;
  unit?: string;
  desc: string;
}

export interface HomeHeroConfig {
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  buttonPrimaryText: string;
  buttonPrimaryHref: string;
  buttonSecondaryText: string;
  buttonSecondaryHref: string;
  bgImage: string;
  bgImageFocus?: string;
}

export interface HomeCtaConfig {
  show?: boolean;
  title: string;
  desc: string;
  buttonText: string;
  buttonHref: string;
}

export interface HomeBusinessSection {
  show: boolean;
  title: string;
  desc: string;
}

export interface CmsHomeConfig {
  hero: HomeHeroConfig;
  metrics: HomeMetricItem[];
  businessSection: HomeBusinessSection;
  cardsSection?: CmsSectionToggle<{
    cards?: CmsCardItem[];
  }>;
  bottomListSection?: CmsSectionToggle<{
    bottomList?: CmsBottomListItem[];
  }>;
  cta: HomeCtaConfig;
  bottomList?: CmsBottomListItem[];
}

export interface CmsSimplePageConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  sectionTitle?: string;
  sectionBody?: string;
  image?: string;
  legacyImage?: string;
  heroShow?: boolean;
  mainShow?: boolean;
  cardsShow?: boolean;
  middleShow?: boolean;
  bottomShow?: boolean;
  bottomListShow?: boolean;
  metricsShow?: boolean;
  heroBgImage?: string;
  heroBgFocus?: string;
  imageFocus?: string;
  sectionPrimaryButtonText?: string;
  sectionPrimaryButtonHref?: string;
  sectionSecondaryButtonText?: string;
  sectionSecondaryButtonHref?: string;
  middleTitle?: string;
  middleSubtitle?: string;
  bottomTitle?: string;
  bottomSubtitle?: string;
  metrics?: CmsMetricItem[];
  bottomList?: CmsBottomListItem[];
  contactInfo?: CmsContactInfo;
  heroSection?: CmsSectionToggle<{
    heroTitle?: string;
    heroSubtitle?: string;
    heroBgImage?: string;
    heroBgFocus?: string;
  }>;
  mainSection?: CmsSectionToggle<{
    sectionTitle?: string;
    sectionBody?: string;
    sectionPrimaryButtonText?: string;
    sectionPrimaryButtonHref?: string;
    sectionSecondaryButtonText?: string;
    sectionSecondaryButtonHref?: string;
    legacyImage?: string;
    image?: string;
    imageFocus?: string;
  }>;
  metricsSection?: CmsSectionToggle<{
    metrics?: CmsMetricItem[];
  }>;
  middleSection?: CmsSectionToggle<{
    middleTitle?: string;
    middleSubtitle?: string;
  }>;
  cardsSection?: CmsSectionToggle<{
    cards?: CmsCardItem[];
  }>;
  bottomSection?: CmsSectionToggle<{
    bottomTitle?: string;
    bottomSubtitle?: string;
  }>;
  bottomListSection?: CmsSectionToggle<{
    bottomList?: CmsBottomListItem[];
  }>;
  contactSection?: CmsSectionToggle<{
    title?: string;
    addressLine1?: string;
    addressLine2?: string;
    email?: string;
    phone?: string;
  }>;
  translation?: CmsTranslationMeta;
}
