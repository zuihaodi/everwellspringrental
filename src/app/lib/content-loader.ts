import type {
  CmsCardItem,
  CmsFinanceItem,
  CmsBottomListItem,
  CmsContactInfo,
  CmsHomeConfig,
  CmsMetricItem,
  CmsNavItem,
  CmsProductItem,
  CmsSimplePageConfig,
} from "../types/content";

type SortablePublished = { order?: number; published?: boolean };

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const contentJsonModules = import.meta.glob<JsonValue>("/src/content/**/*.json", {
  eager: true,
  import: "default",
});

const publicWebpModules = import.meta.glob("/public/**/*.webp", { eager: true });
const publicWebpSet = new Set(
  Object.keys(publicWebpModules).map((k) => k.replace(/^\/public/, "")),
);

function normalizeModulePath(input: string) {
  const normalized = input.replace(/\\/g, "/").replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
const KEY_ALIASES: Record<string, string> = {
  "关于我们": "about",
  "产品与服务": "products",
  "技术解决方案": "solutions",
  "解决方案": "solutions",
  "支持体系": "solutions",
  "融资解决方案": "finance",
  "联系方式": "contact",
  "about us": "about",
  "products & services": "products",
  "technical solutions": "solutions",
  "financing solutions": "finance",
  contact: "contact",
};

function readJsonDir<T>(dir: string): T[] {
  const prefix = normalizeModulePath(dir).replace(/\/$/, "");
  const files = Object.keys(contentJsonModules)
    .filter((filePath) => {
      if (!filePath.startsWith(`${prefix}/`) || !filePath.endsWith(".json")) return false;
      const remainder = filePath.slice(prefix.length + 1);
      return !remainder.includes("/");
    })
    .sort((a, b) => a.localeCompare(b, "en"));
  const list: T[] = [];

  for (const filePath of files) {
    try {
      const raw = contentJsonModules[filePath];
      if (raw === undefined) continue;
      const parsed = cloneJson(raw) as T;
      const maybeObj = parsed as unknown as Record<string, unknown>;
      if (maybeObj && typeof maybeObj === "object" && !Array.isArray(maybeObj) && !("key" in maybeObj)) {
        maybeObj.key = filePath.split("/").pop()?.replace(/\.json$/i, "") || "";
      }
      list.push(parsed);
    } catch {}
  }
  return list;
}

function readJsonFile<T>(filePath: string): T | null {
  const normalized = normalizeModulePath(filePath);
  const raw = contentJsonModules[normalized];
  if (raw === undefined) return null;
  try {
    return cloneJson(raw) as T;
  } catch {
    return null;
  }
}

function normalizeSort<T extends SortablePublished>(items: T[]) {
  return items
    .filter((i) => i.published !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function resolveOptimizedImage(assetPath?: string, prefer: "main" | "small" = "main"): string | undefined {
  if (!assetPath || !assetPath.startsWith("/")) return assetPath;
  const noExt = assetPath.replace(/\.[^/.]+$/, "");
  const webp = `${noExt}.webp`;
  const webpSmall = `${noExt}.sm.webp`;

  if (prefer === "small" && publicWebpSet.has(webpSmall)) return webpSmall;
  if (publicWebpSet.has(webp)) return webp;
  return assetPath;
}

function hasText(value?: string): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function textOr(primary?: string, fallback?: string) {
  return hasText(primary) ? primary : fallback || "";
}

function resolveLocalizedImage(localized?: string, shared?: string, prefer: "main" | "small" = "main") {
  const raw = hasText(localized) ? localized : shared;
  return resolveOptimizedImage(raw, prefer) || raw;
}

const FOCUS_PRESETS = new Set([
  "left top",
  "center top",
  "right top",
  "left center",
  "center center",
  "right center",
  "left bottom",
  "center bottom",
  "right bottom",
]);

function normalizeFocus(value?: string, fallback = "center center") {
  if (!hasText(value)) return fallback;
  const lower = value.trim().toLowerCase();
  return FOCUS_PRESETS.has(lower) ? lower : fallback;
}

function resolveLocalizedFocus(localized?: string, shared?: string, fallback = "center center") {
  return normalizeFocus(localized, normalizeFocus(shared, fallback));
}

function boolOr(primary?: boolean, fallback?: boolean, defaultValue = true) {
  if (typeof primary === "boolean") return primary;
  if (typeof fallback === "boolean") return fallback;
  return defaultValue;
}

function sectionToggle(section?: { show?: boolean; discriminant?: boolean } | null) {
  if (typeof section?.show === "boolean") return section.show;
  if (typeof section?.discriminant === "boolean") return section.discriminant;
  return undefined;
}

function sectionContent<T extends object>(section?: (T & { value?: T }) | null): T | undefined {
  if (!section) return undefined;
  if (section.value && typeof section.value === "object") return section.value;
  return section as T;
}

function normalizeMetrics(list?: CmsMetricItem[], fallback?: CmsMetricItem[]) {
  if (list && list.length > 0) return list;
  if (fallback && fallback.length > 0) return fallback;
  return [];
}

function normalizeBottomList(list?: CmsBottomListItem[], fallback?: CmsBottomListItem[]) {
  const source = list && list.length > 0 ? list : fallback && fallback.length > 0 ? fallback : [];
  return source
    .filter((item) => hasText(item?.title) || hasText(item?.summary));
}

function normalizeContactInfo(primary?: CmsContactInfo, fallback?: CmsContactInfo): CmsContactInfo {
  return {
    show: boolOr(primary?.show, fallback?.show, false),
    title: textOr(primary?.title, fallback?.title),
    addressLine1: textOr(primary?.addressLine1, fallback?.addressLine1),
    addressLine2: textOr(primary?.addressLine2, fallback?.addressLine2),
    email: textOr(primary?.email, fallback?.email),
    phone: textOr(primary?.phone, fallback?.phone),
  };
}

function normalizeInlineCards(list?: CmsCardItem[]) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item?.published !== false && (hasText(item?.title) || hasText(item?.summary)))
    .map((item) => ({
      ...item,
      image: resolveOptimizedImage(item.image, "small"),
      imageFocus: normalizeFocus(item.imageFocus),
    }));
}

function mergeLocalizedCards(zhList?: CmsCardItem[], enList?: CmsCardItem[]) {
  const zhCards = Array.isArray(zhList) ? zhList : [];
  const enCards = Array.isArray(enList) ? enList : [];
  if (enCards.length === 0) return zhCards;
  if (zhCards.length === 0) return enCards;

  const enByKey = new Map<string, CmsCardItem>();
  for (const card of enCards) {
    const key = normalizeKey(card?.key);
    if (key) enByKey.set(key, card);
  }

  const usedKeys = new Set<string>();
  const usedIndex = new Set<number>();
  const merged = zhCards.map((zhCard, idx) => {
    const key = normalizeKey(zhCard?.key);
    const enCard = key ? enByKey.get(key) : enCards[idx];
    if (key) usedKeys.add(key);
    if (!key && enCards[idx]) usedIndex.add(idx);
    return {
      ...zhCard,
      ...enCard,
      title: textOr(enCard?.title, zhCard?.title),
      summary: textOr(enCard?.summary, zhCard?.summary),
      image: resolveLocalizedImage(enCard?.image, zhCard?.image, "small"),
      imageFocus: resolveLocalizedFocus(enCard?.imageFocus, zhCard?.imageFocus),
      ctaText: textOr(enCard?.ctaText, zhCard?.ctaText),
      ctaHref: textOr(enCard?.ctaHref, zhCard?.ctaHref),
      order: typeof enCard?.order === "number" ? enCard.order : zhCard.order,
      published: enCard?.published ?? zhCard.published,
    };
  });

  for (let i = 0; i < enCards.length; i++) {
    const enCard = enCards[i];
    const key = normalizeKey(enCard?.key);
    if ((key && usedKeys.has(key)) || usedIndex.has(i)) continue;
    merged.push(enCard);
  }

  return merged;
}

function normalizeKey(key?: string) {
  if (!hasText(key)) return "";
  const clean = key.replace(/^\d+[-_]?/, "").trim();
  const lower = clean.toLowerCase();
  return KEY_ALIASES[clean] || KEY_ALIASES[lower] || clean;
}

function mergeByKey<T extends { key?: string }>(
  zhItems: T[],
  enItems: T[],
  merge: (zhItem: T, enItem?: T) => T,
): T[] {
  const enMap = new Map<string, T>();
  for (const item of enItems) {
    const k = normalizeKey(item.key);
    if (k) enMap.set(k, item);
  }

  const used = new Set<string>();
  const merged = zhItems.map((zhItem) => {
    const k = normalizeKey(zhItem.key);
    const enItem = k ? enMap.get(k) : undefined;
    if (k) used.add(k);
    return merge(zhItem, enItem);
  });

  for (const enItem of enItems) {
    const k = normalizeKey(enItem.key);
    if (!k || used.has(k)) continue;
    merged.push(enItem);
  }
  return merged;
}

export function loadNavByLang(lang: "zh" | "en"): CmsNavItem[] {
  if (lang === "zh") {
    const items = readJsonDir<CmsNavItem>("src/content/nav/zh");
    return normalizeSort(items);
  }
  const zhItems = normalizeSort(readJsonDir<CmsNavItem>("src/content/nav/zh"));
  const enItems = normalizeSort(readJsonDir<CmsNavItem>("src/content/nav/en"));
  const merged = mergeByKey(zhItems, enItems, (zhItem, enItem) => ({
    ...zhItem,
    ...enItem,
    title: hasText(enItem?.title) ? enItem?.title : zhItem.title,
    href: hasText(enItem?.href) ? enItem?.href : zhItem.href,
    order: typeof enItem?.order === "number" ? enItem.order : zhItem.order,
    published: enItem?.published ?? zhItem.published,
  }));
  return normalizeSort(merged);
}

export function loadFinanceByLang(lang: "zh" | "en"): CmsFinanceItem[] {
  let items: CmsFinanceItem[];
  if (lang === "zh") {
    items = readJsonDir<CmsFinanceItem>("src/content/finance/zh");
  } else {
    const zhItems = normalizeSort(readJsonDir<CmsFinanceItem>("src/content/finance/zh"));
    const enItems = normalizeSort(readJsonDir<CmsFinanceItem>("src/content/finance/en"));
    items = mergeByKey(zhItems, enItems, (zhItem, enItem) => ({
      ...zhItem,
      ...enItem,
      title: hasText(enItem?.title) ? enItem?.title : zhItem.title,
      summary: hasText(enItem?.summary) ? enItem?.summary : zhItem.summary,
      image: hasText(enItem?.image) ? enItem?.image : zhItem.image,
      order: typeof enItem?.order === "number" ? enItem.order : zhItem.order,
      published: enItem?.published ?? zhItem.published,
    }));
  }
  return normalizeSort(items).map((item) => ({
    ...item,
    image: resolveOptimizedImage(item.image, "small"),
    imageFocus: normalizeFocus(item.imageFocus),
  }));
}

export function loadProductsByLang(lang: "zh" | "en"): CmsProductItem[] {
  let items: CmsProductItem[];
  if (lang === "zh") {
    items = readJsonDir<CmsProductItem>("src/content/products/zh");
  } else {
    const zhItems = normalizeSort(readJsonDir<CmsProductItem>("src/content/products/zh"));
    const enItems = normalizeSort(readJsonDir<CmsProductItem>("src/content/products/en"));
    items = mergeByKey(zhItems, enItems, (zhItem, enItem) => ({
      ...zhItem,
      ...enItem,
      category: hasText(enItem?.category) ? enItem?.category : zhItem.category,
      title: hasText(enItem?.title) ? enItem?.title : zhItem.title,
      summary: hasText(enItem?.summary) ? enItem?.summary : zhItem.summary,
      cover: hasText(enItem?.cover) ? enItem?.cover : zhItem.cover,
      ctaHref: hasText(enItem?.ctaHref) ? enItem?.ctaHref : zhItem.ctaHref,
      order: typeof enItem?.order === "number" ? enItem.order : zhItem.order,
      published: enItem?.published ?? zhItem.published,
    }));
  }
  return normalizeSort(items).map((item) => ({
    ...item,
    cover: resolveOptimizedImage(item.cover, "small"),
    coverFocus: normalizeFocus(item.coverFocus),
  }));
}

export function loadHomeByLang(lang: "zh" | "en"): CmsHomeConfig | null {
  let cfg = readJsonFile<CmsHomeConfig>(`src/content/home/${lang}.json`);
  if (lang === "en") {
    const enCfg = cfg;
    const zhCfg = readJsonFile<CmsHomeConfig>("src/content/home/zh.json");
    if (zhCfg && cfg) {
      cfg = {
        ...zhCfg,
        ...cfg,
        hero: {
          ...zhCfg.hero,
          ...cfg.hero,
          titleLine1: hasText(cfg.hero?.titleLine1) ? cfg.hero.titleLine1 : zhCfg.hero.titleLine1,
          titleLine2: hasText(cfg.hero?.titleLine2) ? cfg.hero.titleLine2 : zhCfg.hero.titleLine2,
          subtitle: hasText(cfg.hero?.subtitle) ? cfg.hero.subtitle : zhCfg.hero.subtitle,
          buttonPrimaryText: hasText(cfg.hero?.buttonPrimaryText) ? cfg.hero.buttonPrimaryText : zhCfg.hero.buttonPrimaryText,
          buttonPrimaryHref: hasText(cfg.hero?.buttonPrimaryHref) ? cfg.hero.buttonPrimaryHref : zhCfg.hero.buttonPrimaryHref,
          buttonSecondaryText: hasText(cfg.hero?.buttonSecondaryText) ? cfg.hero.buttonSecondaryText : zhCfg.hero.buttonSecondaryText,
          buttonSecondaryHref: hasText(cfg.hero?.buttonSecondaryHref) ? cfg.hero.buttonSecondaryHref : zhCfg.hero.buttonSecondaryHref,
          bgImage: hasText(cfg.hero?.bgImage) ? cfg.hero.bgImage : zhCfg.hero.bgImage,
          bgImageFocus: hasText(cfg.hero?.bgImageFocus) ? cfg.hero.bgImageFocus : zhCfg.hero.bgImageFocus,
        },
        cta: {
          ...zhCfg.cta,
          ...cfg.cta,
          title: hasText(cfg.cta?.title) ? cfg.cta.title : zhCfg.cta.title,
          desc: hasText(cfg.cta?.desc) ? cfg.cta.desc : zhCfg.cta.desc,
          buttonText: hasText(cfg.cta?.buttonText) ? cfg.cta.buttonText : zhCfg.cta.buttonText,
          buttonHref: hasText(cfg.cta?.buttonHref) ? cfg.cta.buttonHref : zhCfg.cta.buttonHref,
        },
        businessSection: {
          ...zhCfg.businessSection,
          ...cfg.businessSection,
          title: hasText(cfg.businessSection?.title) ? cfg.businessSection.title : zhCfg.businessSection.title,
          desc: hasText(cfg.businessSection?.desc) ? cfg.businessSection.desc : zhCfg.businessSection.desc,
          show: typeof cfg.businessSection?.show === "boolean" ? cfg.businessSection.show : zhCfg.businessSection.show,
        },
        metrics:
          cfg.metrics && cfg.metrics.length > 0
            ? cfg.metrics.map((m, idx) => ({
                value: hasText(m?.value) ? m.value : zhCfg.metrics?.[idx]?.value || "",
                unit: hasText(m?.unit) ? m.unit : zhCfg.metrics?.[idx]?.unit || "",
                desc: hasText(m?.desc) ? m.desc : zhCfg.metrics?.[idx]?.desc || "",
              }))
            : zhCfg.metrics,
      };
      const zhCards = sectionContent(zhCfg.cardsSection)?.cards;
      const enCards = sectionContent(enCfg?.cardsSection)?.cards;
      const mergedCards = mergeLocalizedCards(zhCards, enCards);
      if (mergedCards.length > 0) {
        cfg.cardsSection = {
          ...(zhCfg.cardsSection || {}),
          ...(enCfg?.cardsSection || {}),
          cards: mergedCards,
        };
      }
    } else if (!cfg && zhCfg) {
      cfg = zhCfg;
    }
  }
  if (!cfg) return null;
  const cardsSectionValue = sectionContent(cfg.cardsSection);
  const bottomListSectionValue = sectionContent(cfg.bottomListSection);
  const cardsShow = boolOr(sectionToggle(cfg.cardsSection), true, true);
  const bottomListShow = boolOr(sectionToggle(cfg.bottomListSection), true, true);

  return {
    ...cfg,
    hero: {
      ...cfg.hero,
      bgImage: resolveLocalizedImage(cfg.hero?.bgImage),
      bgImageFocus: normalizeFocus(cfg.hero?.bgImageFocus),
    },
    cardsSection: {
      ...(cfg.cardsSection || {}),
      show: cardsShow,
      cards: normalizeInlineCards(cardsSectionValue?.cards),
    },
    bottomListSection: {
      ...(cfg.bottomListSection || {}),
      show: bottomListShow,
      bottomList: normalizeBottomList(bottomListSectionValue?.bottomList, normalizeBottomList(cfg.bottomList)),
    },
    bottomList: normalizeBottomList(bottomListSectionValue?.bottomList, normalizeBottomList(cfg.bottomList)),
  };
}

function getSimplePageDefaults(page: "about" | "products" | "solutions" | "finance" | "contact", lang: "zh" | "en"): CmsSimplePageConfig {
  const isZh = lang === "zh";
  const defaults: Record<string, CmsSimplePageConfig> = {
    about: {
      heroTitle: isZh ? "关于我们" : "About Us",
      heroSubtitle: isZh ? "源于 2002，深耕能源领域二十余年。" : "Rooted in energy projects since 2002.",
      sectionTitle: isZh ? "公司概况" : "Company Overview",
      sectionBody: isZh ? "我们提供覆盖研发、制造、工程与服务的一体化能力。" : "We provide integrated capabilities across R&D, manufacturing, engineering and services.",
      image: "/images/card1.jpg",
      middleTitle: isZh ? "核心优势" : "Core Strengths",
      middleSubtitle: isZh ? "面向全球客户的长期协作能力" : "Long-term collaboration capability for global clients",
      bottomTitle: isZh ? "资质与认证" : "Qualifications & Certifications",
      bottomSubtitle: isZh ? "标准化体系保障交付质量" : "Standardized systems ensure delivery quality",
    },
    products: {
      heroTitle: isZh ? "产品与服务" : "Products & Services",
      heroSubtitle: isZh ? "钻采装备销售租赁 | 动力总包 | 全球工程服务" : "Rig sales & rental | Power package | Global engineering",
      sectionTitle: isZh ? "主要产品与服务" : "Main Offerings",
      sectionBody: isZh ? "根据项目环境与作业场景提供定制化产品与服务。" : "Tailored offerings for different project conditions.",
      image: "/images/card2.jpg",
      middleTitle: isZh ? "产品卡片" : "Product Cards",
      middleSubtitle: isZh ? "按模块化方式管理产品信息" : "Manage product info in modular cards",
      bottomTitle: isZh ? "服务保障" : "Service Assurance",
      bottomSubtitle: isZh ? "从方案到交付全流程支持" : "End-to-end support from proposal to delivery",
    },
    solutions: {
      heroTitle: isZh ? "支持与保障" : "Support System",
      heroSubtitle: isZh ? "全方位工程技术与支持体系" : "Comprehensive engineering and support services",
      sectionTitle: isZh ? "支持体系简介" : "Support Overview",
      sectionBody: isZh ? "聚焦 HSE、风险管控、定制培训三大领域。" : "Focused on HSE, risk control and customized training.",
      image: "/images/card3.jpg",
      middleTitle: isZh ? "支持模块" : "Support Modules",
      middleSubtitle: isZh ? "通过卡片管理专项能力" : "Manage specialized capabilities by cards",
      bottomTitle: isZh ? "资质与认证" : "Qualifications & Certifications",
      bottomSubtitle: isZh ? "标准化与体系化并重" : "Balanced standardization and system management",
    },
    finance: {
      heroTitle: isZh ? "融资解决方案" : "Financing Solutions",
      heroSubtitle: isZh ? "围绕设备与项目周期的资金配置服务" : "Funding structures for equipment and project cycles",
      sectionTitle: isZh ? "融资能力简介" : "Financing Overview",
      sectionBody: isZh ? "通过多元化金融工具支持业务落地与扩张。" : "Support execution and growth with diversified financial tools.",
      image: "/images/card3.jpg",
      middleTitle: isZh ? "融资产品卡片" : "Financing Cards",
      middleSubtitle: isZh ? "按场景维护融资方案与条款" : "Maintain financing schemes by scenarios",
      bottomTitle: isZh ? "合作模式" : "Cooperation Models",
      bottomSubtitle: isZh ? "灵活组合，提升资金效率" : "Flexible combinations to improve capital efficiency",
    },
    contact: {
      heroTitle: isZh ? "联系方式" : "Contact",
      heroSubtitle: isZh ? "期待与您合作" : "We look forward to working with you",
      sectionTitle: isZh ? "联系方式" : "Get in Touch",
      sectionBody: isZh ? "如需进一步了解，请通过下方信息联系我们。" : "For more information, please contact us via the details below.",
      image: "/images/card1.jpg",
      middleTitle: isZh ? "服务入口" : "Service Entry",
      middleSubtitle: isZh ? "可通过卡片管理咨询入口" : "Manage inquiry entries through cards",
      bottomTitle: isZh ? "常见联系渠道" : "Common Channels",
      bottomSubtitle: isZh ? "快速找到对应团队" : "Quickly reach the right team",
      contactInfo: {
        show: true,
        title: isZh ? "联系信息" : "Contact Details",
      },
    },
  };

  const base = defaults[page];
  return {
    ...base,
    heroShow: true,
    mainShow: true,
    cardsShow: true,
    middleShow: true,
    bottomShow: true,
    bottomListShow: true,
    metricsShow: false,
    sectionPrimaryButtonText: "",
    sectionPrimaryButtonHref: "",
    sectionSecondaryButtonText: "",
    sectionSecondaryButtonHref: "",
    heroBgImage: "",
    heroBgFocus: "center center",
    imageFocus: "center center",
    metrics: [],
    bottomList: [],
    contactInfo: normalizeContactInfo(base.contactInfo, undefined),
  };
}

export function loadSimplePageByLang(page: "about" | "products" | "solutions" | "finance" | "contact", lang: "zh" | "en"): CmsSimplePageConfig {
  const defaults = getSimplePageDefaults(page, lang);
  let cfg = readJsonFile<CmsSimplePageConfig>(`src/content/pages/${lang}/${page}.json`);
  let zhCfg: CmsSimplePageConfig | null = null;
  const enCfg = lang === "en" ? cfg : null;
  if (lang === "en") {
    zhCfg = readJsonFile<CmsSimplePageConfig>(`src/content/pages/zh/${page}.json`);
    if (zhCfg && cfg) {
      cfg = { ...zhCfg, ...cfg };
    } else if (!cfg && zhCfg) {
      cfg = zhCfg;
    }
  }
  cfg = cfg || defaults;

  const heroSectionValue = sectionContent(cfg.heroSection);
  const mainSectionValue = sectionContent(cfg.mainSection);
  const metricsSectionValue = sectionContent(cfg.metricsSection);
  const middleSectionValue = sectionContent(cfg.middleSection);
  const cardsSectionValue = sectionContent(cfg.cardsSection);
  const bottomSectionValue = sectionContent(cfg.bottomSection);
  const bottomListSectionValue = sectionContent(cfg.bottomListSection);
  const contactSectionValue = sectionContent(cfg.contactSection);

  const hasMainSection = !!cfg.mainSection;
  const hasHeroSection = !!cfg.heroSection;
  const zhMainSectionValue = sectionContent(zhCfg?.mainSection);
  const zhHeroSectionValue = sectionContent(zhCfg?.heroSection);
  const enMainSectionValue = sectionContent(enCfg?.mainSection);
  const enHeroSectionValue = sectionContent(enCfg?.heroSection);
  const zhCards = sectionContent(zhCfg?.cardsSection)?.cards;
  const enCards = sectionContent(enCfg?.cardsSection)?.cards;

  const finalImage = hasMainSection
    ? resolveLocalizedImage(
        lang === "en" ? textOr(enMainSectionValue?.image, enMainSectionValue?.legacyImage) : mainSectionValue?.image,
        lang === "en"
          ? textOr(zhMainSectionValue?.image, textOr(zhMainSectionValue?.legacyImage, textOr(zhCfg?.image, textOr(zhCfg?.legacyImage, defaults.image))))
          : textOr(mainSectionValue?.legacyImage, ""),
      )
    : resolveLocalizedImage(
        lang === "en" ? textOr(enCfg?.image, enCfg?.legacyImage) : cfg.image,
        lang === "en" ? textOr(zhCfg?.image, textOr(zhCfg?.legacyImage, defaults.image)) : textOr(cfg.legacyImage, defaults.image),
      );
  const finalBg = hasHeroSection
    ? resolveLocalizedImage(
        lang === "en" ? enHeroSectionValue?.heroBgImage : heroSectionValue?.heroBgImage,
        lang === "en" ? textOr(zhHeroSectionValue?.heroBgImage, zhCfg?.heroBgImage) : "",
      )
    : resolveLocalizedImage(lang === "en" ? enCfg?.heroBgImage : cfg.heroBgImage, lang === "en" ? zhCfg?.heroBgImage : defaults.heroBgImage);
  const finalImageFocus = hasMainSection
    ? resolveLocalizedFocus(
        lang === "en" ? textOr(enMainSectionValue?.imageFocus, enCfg?.imageFocus) : mainSectionValue?.imageFocus,
        lang === "en" ? textOr(zhMainSectionValue?.imageFocus, zhCfg?.imageFocus) : cfg.imageFocus,
      )
    : resolveLocalizedFocus(lang === "en" ? enCfg?.imageFocus : cfg.imageFocus, lang === "en" ? zhCfg?.imageFocus : undefined);
  const finalBgFocus = hasHeroSection
    ? resolveLocalizedFocus(
        lang === "en" ? textOr(enHeroSectionValue?.heroBgFocus, enCfg?.heroBgFocus) : heroSectionValue?.heroBgFocus,
        lang === "en" ? textOr(zhHeroSectionValue?.heroBgFocus, zhCfg?.heroBgFocus) : cfg.heroBgFocus,
      )
    : resolveLocalizedFocus(lang === "en" ? enCfg?.heroBgFocus : cfg.heroBgFocus, lang === "en" ? zhCfg?.heroBgFocus : undefined);
  const heroShow = boolOr(sectionToggle(cfg.heroSection), boolOr(cfg.heroShow, defaults.heroShow, true), true);
  const mainShow = boolOr(sectionToggle(cfg.mainSection), boolOr(cfg.mainShow, defaults.mainShow, true), true);
  const metricsShow = boolOr(sectionToggle(cfg.metricsSection), boolOr(cfg.metricsShow, defaults.metricsShow, false), false);
  const middleShow = boolOr(sectionToggle(cfg.middleSection), boolOr(cfg.middleShow, defaults.middleShow, true), true);
  const cardsShow = boolOr(sectionToggle(cfg.cardsSection), boolOr(cfg.cardsShow, defaults.cardsShow, true), true);
  const bottomShow = boolOr(sectionToggle(cfg.bottomSection), boolOr(cfg.bottomShow, defaults.bottomShow, true), true);
  const bottomListShow = boolOr(sectionToggle(cfg.bottomListSection), boolOr(cfg.bottomListShow, defaults.bottomListShow, true), true);
  const contactShow = boolOr(sectionToggle(cfg.contactSection), boolOr(cfg.contactInfo?.show, defaults.contactInfo?.show, false), false);

  return {
    ...defaults,
    ...cfg,
    heroTitle: textOr(heroSectionValue?.heroTitle, textOr(cfg.heroTitle, defaults.heroTitle)),
    heroSubtitle: textOr(heroSectionValue?.heroSubtitle, textOr(cfg.heroSubtitle, defaults.heroSubtitle)),
    sectionTitle: textOr(mainSectionValue?.sectionTitle, textOr(cfg.sectionTitle, defaults.sectionTitle)),
    sectionBody: textOr(mainSectionValue?.sectionBody, textOr(cfg.sectionBody, defaults.sectionBody)),
    middleTitle: textOr(middleSectionValue?.middleTitle, textOr(cfg.middleTitle, defaults.middleTitle)),
    middleSubtitle: textOr(middleSectionValue?.middleSubtitle, textOr(cfg.middleSubtitle, defaults.middleSubtitle)),
    bottomTitle: textOr(bottomSectionValue?.bottomTitle, textOr(cfg.bottomTitle, defaults.bottomTitle)),
    bottomSubtitle: textOr(bottomSectionValue?.bottomSubtitle, textOr(cfg.bottomSubtitle, defaults.bottomSubtitle)),
    sectionPrimaryButtonText: textOr(mainSectionValue?.sectionPrimaryButtonText, textOr(cfg.sectionPrimaryButtonText, defaults.sectionPrimaryButtonText)),
    sectionPrimaryButtonHref: textOr(mainSectionValue?.sectionPrimaryButtonHref, textOr(cfg.sectionPrimaryButtonHref, defaults.sectionPrimaryButtonHref)),
    sectionSecondaryButtonText: textOr(mainSectionValue?.sectionSecondaryButtonText, textOr(cfg.sectionSecondaryButtonText, defaults.sectionSecondaryButtonText)),
    sectionSecondaryButtonHref: textOr(mainSectionValue?.sectionSecondaryButtonHref, textOr(cfg.sectionSecondaryButtonHref, defaults.sectionSecondaryButtonHref)),
    heroShow,
    mainShow,
    cardsShow,
    middleShow,
    bottomShow,
    bottomListShow,
    metricsShow,
    image: finalImage,
    imageFocus: finalImageFocus,
    legacyImage: textOr(mainSectionValue?.legacyImage, textOr(cfg.legacyImage, defaults.legacyImage)),
    heroBgImage: finalBg,
    heroBgFocus: finalBgFocus,
    metrics: normalizeMetrics(metricsSectionValue?.metrics, normalizeMetrics(cfg.metrics, defaults.metrics)),
    bottomList: normalizeBottomList(bottomListSectionValue?.bottomList, normalizeBottomList(cfg.bottomList, defaults.bottomList)),
    cardsSection: {
      ...(cfg.cardsSection || {}),
      show: cardsShow,
      cards: normalizeInlineCards(lang === "en" ? mergeLocalizedCards(zhCards, enCards) : cardsSectionValue?.cards),
    },
    contactInfo: normalizeContactInfo(
      {
        show: contactShow,
        title: textOr(contactSectionValue?.title, cfg.contactInfo?.title),
        addressLine1: textOr(contactSectionValue?.addressLine1, cfg.contactInfo?.addressLine1),
        addressLine2: textOr(contactSectionValue?.addressLine2, cfg.contactInfo?.addressLine2),
        email: textOr(contactSectionValue?.email, cfg.contactInfo?.email),
        phone: textOr(contactSectionValue?.phone, cfg.contactInfo?.phone),
      },
      defaults.contactInfo,
    ),
  };
}

function filterCardsByPage(items: CmsCardItem[], pageKey: CmsCardItem["pageKey"]) {
  return items.filter((i) => i.pageKey === pageKey);
}

export function loadCardsByLangPage(
  lang: "zh" | "en",
  pageKey: "home" | "about" | "products" | "finance" | "solutions" | "contact",
): CmsCardItem[] {
  if (pageKey === "home") {
    const homeCfg = loadHomeByLang(lang);
    const inlineCards = normalizeInlineCards(homeCfg?.cardsSection?.cards);
    if (inlineCards.length > 0) return inlineCards;
  } else {
    const pageCfg = loadSimplePageByLang(pageKey, lang);
    const inlineCards = normalizeInlineCards(pageCfg.cardsSection?.cards);
    if (inlineCards.length > 0) return inlineCards;
  }

  let items: CmsCardItem[];
  if (lang === "zh") {
    items = filterCardsByPage(readJsonDir<CmsCardItem>("src/content/cards/zh"), pageKey);
  } else {
    const zhItems = filterCardsByPage(normalizeSort(readJsonDir<CmsCardItem>("src/content/cards/zh")), pageKey);
    const enItems = filterCardsByPage(normalizeSort(readJsonDir<CmsCardItem>("src/content/cards/en")), pageKey);
    items = mergeByKey(zhItems, enItems, (zhItem, enItem) => ({
      ...zhItem,
      ...enItem,
      pageKey,
      title: hasText(enItem?.title) ? enItem?.title : zhItem.title,
      summary: hasText(enItem?.summary) ? enItem?.summary : zhItem.summary,
      image: hasText(enItem?.image) ? enItem?.image : zhItem.image,
      ctaText: hasText(enItem?.ctaText) ? enItem?.ctaText : zhItem.ctaText,
      ctaHref: hasText(enItem?.ctaHref) ? enItem?.ctaHref : zhItem.ctaHref,
      order: typeof enItem?.order === "number" ? enItem.order : zhItem.order,
      published: enItem?.published ?? zhItem.published,
    }));
  }

  return normalizeSort(items).map((item) => ({
    ...item,
    image: resolveOptimizedImage(item.image, "small"),
    imageFocus: normalizeFocus(item.imageFocus),
  }));
}

