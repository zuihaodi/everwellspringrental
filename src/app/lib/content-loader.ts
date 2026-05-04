import type {
  CmsCardItem,
  CmsBottomListItem,
  CmsContactInfo,
  CmsHomeConfig,
  CmsMetricItem,
  CmsNavItem,
  CmsPageSectionGroup,
  CmsSimplePageConfig,
} from "../types/content";

type SortablePublished = { order?: number; published?: boolean };
type Lang = "zh" | "en";
type PageSlot = "page1" | "page2" | "page3" | "page4" | "page5";
type SimplePageKey = PageSlot;
type CmsNavConfig = Partial<Record<PageSlot, Omit<CmsNavItem, "key">>>;
type LoadNavOptions = { includeUnpublished?: boolean };

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;
const BLANK_TOKEN = "#blank#";

const contentJsonModules = import.meta.glob<JsonValue>("/src/content/**/*.json", {
  eager: true,
  import: "default",
});

function normalizeModulePath(input: string) {
  const normalized = input.replace(/\\/g, "/").replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
  return assetPath;
}

function hasText(value?: string): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBlankToken(value?: string) {
  return typeof value === "string" && value.trim().toLowerCase() === BLANK_TOKEN;
}

function hasDisplayText(value?: string): value is string {
  return hasText(value) && !isBlankToken(value);
}

function textOr(primary?: string, fallback?: string) {
  return hasText(primary) ? primary : fallback || "";
}

function textOrHidden(primary?: string, fallback?: string) {
  if (isBlankToken(primary)) return "";
  if (hasText(primary)) return primary;
  if (isBlankToken(fallback)) return "";
  return fallback || "";
}

function textOrBlank(primary?: string, fallback?: string) {
  if (isBlankToken(primary)) return "";
  if (typeof primary === "string") return primary.trim();
  if (isBlankToken(fallback)) return "";
  if (typeof fallback === "string") return fallback.trim();
  return "";
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
    .filter((item) => hasDisplayText(item?.title) || hasDisplayText(item?.summary))
    .map((item) => ({
      ...item,
      title: textOrBlank(item?.title),
      summary: textOrBlank(item?.summary),
    }));
}

function normalizeContactInfo(primary?: CmsContactInfo, fallback?: CmsContactInfo): CmsContactInfo {
  return {
    show: boolOr(primary?.show, fallback?.show, false),
    title: textOrHidden(primary?.title, fallback?.title),
    addressLine1: textOrHidden(primary?.addressLine1, fallback?.addressLine1),
    addressLine2: textOrHidden(primary?.addressLine2, fallback?.addressLine2),
    email: textOrHidden(primary?.email, fallback?.email),
    phone: textOrHidden(primary?.phone, fallback?.phone),
  };
}

function normalizeInlineCards(list?: CmsCardItem[]) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item?.published !== false && (hasDisplayText(item?.title) || hasDisplayText(item?.summary)))
    .map((item) => ({
      ...item,
      title: textOrBlank(item.title),
      summary: textOrBlank(item.summary),
      ctaText: textOrBlank(item.ctaText),
      ctaHref: textOrBlank(item.ctaHref),
      image: item.image,
      imageFocus: normalizeFocus(item.imageFocus),
    }));
}

function normalizeSectionGroups(
  groups?: CmsPageSectionGroup[],
  fallbackTitle?: string,
  fallbackSubtitle?: string,
  fallbackCards?: CmsCardItem[],
  fallbackShow = true,
) {
  const normalized = (Array.isArray(groups) ? groups : [])
    .map((group) => ({
      show: group?.show ?? true,
      title: textOrHidden(group?.title),
      subtitle: textOrHidden(group?.subtitle),
      cards: normalizeInlineCards(group?.cards),
    }))
    .filter((group) => group.show !== false && (hasDisplayText(group.title) || hasDisplayText(group.subtitle) || group.cards.length > 0));

  if (normalized.length > 0) return normalized;

  const legacyCards = normalizeInlineCards(fallbackCards);
  const legacyTitle = textOrHidden(fallbackTitle);
  const legacySubtitle = textOrHidden(fallbackSubtitle);
  if (fallbackShow === false) return [];
  if (!hasDisplayText(legacyTitle) && !hasDisplayText(legacySubtitle) && legacyCards.length === 0) return [];

  return [
    {
      show: fallbackShow,
      title: legacyTitle,
      subtitle: legacySubtitle,
      cards: legacyCards,
    },
  ];
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
      title: textOrHidden(enCard?.title, zhCard?.title),
      summary: textOrHidden(enCard?.summary, zhCard?.summary),
      image: resolveLocalizedImage(enCard?.image, zhCard?.image, "small"),
      imageFocus: resolveLocalizedFocus(enCard?.imageFocus, zhCard?.imageFocus),
      ctaText: textOrBlank(enCard?.ctaText, zhCard?.ctaText),
      ctaHref: textOrBlank(enCard?.ctaHref, zhCard?.ctaHref),
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

function mergeLocalizedSectionGroups(zhGroups?: CmsPageSectionGroup[], enGroups?: CmsPageSectionGroup[]) {
  const base = Array.isArray(zhGroups) ? zhGroups : [];
  const localized = Array.isArray(enGroups) ? enGroups : [];
  const length = Math.max(base.length, localized.length);
  const merged: CmsPageSectionGroup[] = [];

  for (let i = 0; i < length; i++) {
    const zhGroup = base[i];
    const enGroup = localized[i];
    if (!zhGroup && !enGroup) continue;
    merged.push({
      show: typeof enGroup?.show === "boolean" ? enGroup.show : zhGroup?.show,
      title: textOrHidden(enGroup?.title, zhGroup?.title),
      subtitle: textOrHidden(enGroup?.subtitle, zhGroup?.subtitle),
      cards: mergeLocalizedCards(zhGroup?.cards, enGroup?.cards),
    });
  }

  return merged;
}

function normalizeKey(key?: string) {
  if (!hasText(key)) return "";
  const clean = key.replace(/^\d+[-_]?/, "").trim();
  return clean;
}

function isPageSlot(value: string): value is PageSlot {
  return value === "page1" || value === "page2" || value === "page3" || value === "page4" || value === "page5";
}

function normalizePageKey(page: SimplePageKey): PageSlot {
  const normalized = normalizeKey(page);
  return isPageSlot(normalized) ? normalized : "page1";
}

function readSimplePageConfig(lang: Lang, slot: PageSlot) {
  return readJsonFile<CmsSimplePageConfig>(`src/content/pages/${lang}/${slot}.json`);
}

function isSafeLangHref(href: unknown, lang: Lang) {
  if (!hasText(href)) return false;
  const base = lang === "zh" ? "/zh/" : "/en/";
  return href === `/${lang}` || href.startsWith(base);
}

export function resolvePageSlotByHref(lang: Lang, pathname: string): PageSlot | null {
  const cleanPath = pathname.replace(/\/+$/, "") || `/${lang}`;
  const navItems = loadNavByLang(lang);
  for (const item of navItems) {
    const slot = normalizeKey(item.key);
    if (!isPageSlot(slot)) continue;
    const configuredHref = isSafeLangHref(item.href, lang) ? item.href!.replace(/\/+$/, "") : "";
    if (configuredHref && configuredHref === cleanPath) return slot;
  }

  return null;
}

export function loadNavByLang(lang: "zh" | "en", options: LoadNavOptions = {}): CmsNavItem[] {
  const cfg = readJsonFile<CmsNavConfig>(`src/content/nav/${lang}.json`);
  if (!cfg) return [];
  const usedHrefs = new Set<string>();
  const items = (["page1", "page2", "page3", "page4", "page5"] as PageSlot[]).map((key, index) => {
    const rawHref = cfg[key]?.href;
    const normalizedHref = isSafeLangHref(rawHref, lang) ? rawHref!.replace(/\/+$/, "") || `/${lang}` : "";
    const href = normalizedHref && !usedHrefs.has(normalizedHref) ? normalizedHref : "";
    if (href) usedHrefs.add(href);
    return {
      key,
      ...cfg[key],
      href,
      order: typeof cfg[key]?.order === "number" ? cfg[key]?.order : index + 1,
      published: cfg[key]?.published ?? true,
    };
  });
  return options.includeUnpublished ? items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : normalizeSort(items);
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
          titleLine1: textOrHidden(cfg.hero?.titleLine1, zhCfg.hero.titleLine1),
          titleLine2: textOrHidden(cfg.hero?.titleLine2, zhCfg.hero.titleLine2),
          subtitle: textOrHidden(cfg.hero?.subtitle, zhCfg.hero.subtitle),
          buttonPrimaryText: textOrBlank(cfg.hero?.buttonPrimaryText),
          buttonPrimaryHref: textOrBlank(cfg.hero?.buttonPrimaryHref),
          buttonSecondaryText: textOrBlank(cfg.hero?.buttonSecondaryText),
          buttonSecondaryHref: textOrBlank(cfg.hero?.buttonSecondaryHref),
          buttonTertiaryText: textOrBlank(cfg.hero?.buttonTertiaryText),
          buttonTertiaryHref: textOrBlank(cfg.hero?.buttonTertiaryHref),
          buttonQuaternaryText: textOrBlank(cfg.hero?.buttonQuaternaryText),
          buttonQuaternaryHref: textOrBlank(cfg.hero?.buttonQuaternaryHref),
          bgImage: hasText(cfg.hero?.bgImage) ? cfg.hero.bgImage : zhCfg.hero.bgImage,
          bgImageFocus: hasText(cfg.hero?.bgImageFocus) ? cfg.hero.bgImageFocus : zhCfg.hero.bgImageFocus,
        },
        cta: {
          ...zhCfg.cta,
          ...cfg.cta,
          title: textOrHidden(cfg.cta?.title, zhCfg.cta.title),
          desc: textOrHidden(cfg.cta?.desc, zhCfg.cta.desc),
          buttonText: textOrBlank(cfg.cta?.buttonText),
          buttonHref: textOrBlank(cfg.cta?.buttonHref),
        },
        businessSection: {
          ...zhCfg.businessSection,
          ...cfg.businessSection,
          title: textOrHidden(cfg.businessSection?.title, zhCfg.businessSection.title),
          desc: textOrHidden(cfg.businessSection?.desc, zhCfg.businessSection.desc),
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
      titleLine1: textOrHidden(cfg.hero?.titleLine1),
      titleLine2: textOrHidden(cfg.hero?.titleLine2),
      subtitle: textOrHidden(cfg.hero?.subtitle),
      buttonPrimaryText: textOrBlank(cfg.hero?.buttonPrimaryText),
      buttonPrimaryHref: textOrBlank(cfg.hero?.buttonPrimaryHref),
      buttonSecondaryText: textOrBlank(cfg.hero?.buttonSecondaryText),
      buttonSecondaryHref: textOrBlank(cfg.hero?.buttonSecondaryHref),
      buttonTertiaryText: textOrBlank(cfg.hero?.buttonTertiaryText),
      buttonTertiaryHref: textOrBlank(cfg.hero?.buttonTertiaryHref),
      buttonQuaternaryText: textOrBlank(cfg.hero?.buttonQuaternaryText),
      buttonQuaternaryHref: textOrBlank(cfg.hero?.buttonQuaternaryHref),
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

function getSimplePageDefaults(page: SimplePageKey, lang: Lang): CmsSimplePageConfig {
  const isZh = lang === "zh";
  const defaults: Record<PageSlot, CmsSimplePageConfig> = {
    page1: {
      heroTitle: isZh ? "首屏页面标题" : "Hero Title",
      heroSubtitle: isZh ? "首屏页面副标题" : "Hero Subtitle",
      sectionTitle: isZh ? "主体区块标题" : "Main Section Title",
      sectionBody: isZh ? "主体区块内容" : "Main Section Body",
      image: "/images/card1.jpg",
      middleTitle: isZh ? "中部区块标题" : "Middle Section Title",
      middleSubtitle: isZh ? "中部区块副标题" : "Middle Section Subtitle",
      bottomTitle: isZh ? "底部区块标题" : "Bottom Section Title",
      bottomSubtitle: isZh ? "底部区块副标题" : "Bottom Section Subtitle",
    },
    page2: {
      heroTitle: isZh ? "首屏页面标题" : "Hero Title",
      heroSubtitle: isZh ? "首屏页面副标题" : "Hero Subtitle",
      sectionTitle: isZh ? "主体区块标题" : "Main Section Title",
      sectionBody: isZh ? "主体区块内容" : "Main Section Body",
      image: "/images/card2.jpg",
      middleTitle: isZh ? "中部区块标题" : "Middle Section Title",
      middleSubtitle: isZh ? "中部区块副标题" : "Middle Section Subtitle",
      bottomTitle: isZh ? "底部区块标题" : "Bottom Section Title",
      bottomSubtitle: isZh ? "底部区块副标题" : "Bottom Section Subtitle",
    },
    page3: {
      heroTitle: isZh ? "首屏页面标题" : "Hero Title",
      heroSubtitle: isZh ? "首屏页面副标题" : "Hero Subtitle",
      sectionTitle: isZh ? "主体区块标题" : "Main Section Title",
      sectionBody: isZh ? "主体区块内容" : "Main Section Body",
      image: "/images/card3.jpg",
      middleTitle: isZh ? "中部区块标题" : "Middle Section Title",
      middleSubtitle: isZh ? "中部区块副标题" : "Middle Section Subtitle",
      bottomTitle: isZh ? "底部区块标题" : "Bottom Section Title",
      bottomSubtitle: isZh ? "底部区块副标题" : "Bottom Section Subtitle",
    },
    page4: {
      heroTitle: isZh ? "首屏页面标题" : "Hero Title",
      heroSubtitle: isZh ? "首屏页面副标题" : "Hero Subtitle",
      sectionTitle: isZh ? "主体区块标题" : "Main Section Title",
      sectionBody: isZh ? "主体区块内容" : "Main Section Body",
      image: "/images/card3.jpg",
      middleTitle: isZh ? "中部区块标题" : "Middle Section Title",
      middleSubtitle: isZh ? "中部区块副标题" : "Middle Section Subtitle",
      bottomTitle: isZh ? "底部区块标题" : "Bottom Section Title",
      bottomSubtitle: isZh ? "底部区块副标题" : "Bottom Section Subtitle",
    },
    page5: {
      heroTitle: isZh ? "首屏页面标题" : "Hero Title",
      heroSubtitle: isZh ? "首屏页面副标题" : "Hero Subtitle",
      sectionTitle: isZh ? "主体区块标题" : "Main Section Title",
      sectionBody: isZh ? "主体区块内容" : "Main Section Body",
      image: "/images/card1.jpg",
      middleTitle: isZh ? "中部区块标题" : "Middle Section Title",
      middleSubtitle: isZh ? "中部区块副标题" : "Middle Section Subtitle",
      bottomTitle: isZh ? "底部区块标题" : "Bottom Section Title",
      bottomSubtitle: isZh ? "底部区块副标题" : "Bottom Section Subtitle",
      contactInfo: {
        show: true,
        title: isZh ? "联系信息标题" : "Contact Info Title",
      },
    },
  };

  const base = defaults[normalizePageKey(page)];
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

export function loadSimplePageByLang(page: SimplePageKey, lang: Lang): CmsSimplePageConfig {
  const slot = normalizePageKey(page);
  const defaults = getSimplePageDefaults(slot, lang);
  let cfg = readSimplePageConfig(lang, slot);
  let zhCfg: CmsSimplePageConfig | null = null;
  const enCfg = lang === "en" ? cfg : null;
  if (lang === "en") {
    zhCfg = readSimplePageConfig("zh", slot);
    if (zhCfg && cfg) {
      cfg = { ...zhCfg, ...cfg };
      const mergedGroups = mergeLocalizedSectionGroups(zhCfg.sectionGroups, cfg.sectionGroups);
      if (mergedGroups.length > 0) cfg.sectionGroups = mergedGroups;
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
  const localizedLegacyCards = lang === "en" ? mergeLocalizedCards(zhCards, enCards) : cardsSectionValue?.cards;

  const finalImage = hasMainSection
    ? resolveLocalizedImage(lang === "en" ? enMainSectionValue?.image : mainSectionValue?.image, lang === "en" ? zhMainSectionValue?.image : undefined)
    : undefined;
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
  const sectionGroups = normalizeSectionGroups(
    cfg.sectionGroups,
    middleSectionValue?.middleTitle ?? cfg.middleTitle ?? defaults.middleTitle,
    middleSectionValue?.middleSubtitle ?? cfg.middleSubtitle ?? defaults.middleSubtitle,
    localizedLegacyCards,
    middleShow,
  );

  return {
    ...defaults,
    ...cfg,
    heroTitle: textOrHidden(heroSectionValue?.heroTitle, textOrHidden(cfg.heroTitle, defaults.heroTitle)),
    heroSubtitle: textOrHidden(heroSectionValue?.heroSubtitle, textOrHidden(cfg.heroSubtitle, defaults.heroSubtitle)),
    sectionTitle: textOrHidden(mainSectionValue?.sectionTitle, textOrHidden(cfg.sectionTitle, defaults.sectionTitle)),
    sectionBody: textOrHidden(mainSectionValue?.sectionBody, textOrHidden(cfg.sectionBody, defaults.sectionBody)),
    middleTitle: textOrHidden(middleSectionValue?.middleTitle, textOrHidden(cfg.middleTitle, defaults.middleTitle)),
    middleSubtitle: textOrHidden(middleSectionValue?.middleSubtitle, textOrHidden(cfg.middleSubtitle, defaults.middleSubtitle)),
    bottomTitle: textOrHidden(bottomSectionValue?.bottomTitle, textOrHidden(cfg.bottomTitle, defaults.bottomTitle)),
    bottomSubtitle: textOrHidden(bottomSectionValue?.bottomSubtitle, textOrHidden(cfg.bottomSubtitle, defaults.bottomSubtitle)),
    sectionPrimaryButtonText: textOrBlank(mainSectionValue?.sectionPrimaryButtonText, cfg.sectionPrimaryButtonText),
    sectionPrimaryButtonHref: textOrBlank(mainSectionValue?.sectionPrimaryButtonHref, cfg.sectionPrimaryButtonHref),
    sectionSecondaryButtonText: textOrBlank(mainSectionValue?.sectionSecondaryButtonText, cfg.sectionSecondaryButtonText),
    sectionSecondaryButtonHref: textOrBlank(mainSectionValue?.sectionSecondaryButtonHref, cfg.sectionSecondaryButtonHref),
    heroShow,
    mainShow,
    cardsShow,
    middleShow,
    bottomShow,
    bottomListShow,
    metricsShow,
    image: finalImage,
    imageFocus: finalImageFocus,
    heroBgImage: finalBg,
    heroBgFocus: finalBgFocus,
    metrics: normalizeMetrics(metricsSectionValue?.metrics, normalizeMetrics(cfg.metrics, defaults.metrics)),
    bottomList: normalizeBottomList(bottomListSectionValue?.bottomList, normalizeBottomList(cfg.bottomList, defaults.bottomList)),
    sectionGroups,
    cardsSection: {
      ...(cfg.cardsSection || {}),
      show: cardsShow,
      cards: normalizeInlineCards(localizedLegacyCards),
    },
    contactInfo: normalizeContactInfo(
      {
        show: contactShow,
        title: textOrHidden(contactSectionValue?.title, cfg.contactInfo?.title),
        addressLine1: textOrHidden(contactSectionValue?.addressLine1, cfg.contactInfo?.addressLine1),
        addressLine2: textOrHidden(contactSectionValue?.addressLine2, cfg.contactInfo?.addressLine2),
        email: textOrHidden(contactSectionValue?.email, cfg.contactInfo?.email),
        phone: textOrHidden(contactSectionValue?.phone, cfg.contactInfo?.phone),
      },
      defaults.contactInfo,
    ),
  };
}

export function loadCardsByLangPage(
  lang: Lang,
  pageKey: SimplePageKey,
): CmsCardItem[] {
  const pageCfg = loadSimplePageByLang(pageKey, lang);
  return (pageCfg.sectionGroups || []).flatMap((group) => group.cards || []);
}

