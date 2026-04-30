import fallbackConfig from "../../content/site/settings.json";

export type Lang = "zh" | "en";
export type LanguageMode = "zh_en" | "en_zh" | "zh_only" | "en_only";

export interface SiteSettings {
  companyName: string;
  shortBrand: string;
  logo?: string;
  languageMode: LanguageMode;
  defaultDescription: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  copyrightYear: string;
}

const allowedModes = new Set<LanguageMode>(["zh_en", "en_zh", "zh_only", "en_only"]);

function textOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeMode(value: unknown): LanguageMode {
  return typeof value === "string" && allowedModes.has(value as LanguageMode)
    ? (value as LanguageMode)
    : "zh_en";
}

export function getSiteSettings(): SiteSettings {
  const raw = fallbackConfig as Partial<SiteSettings>;
  return {
    companyName: textOr(raw.companyName, "Lasting Qual Pte. Ltd."),
    shortBrand: textOr(raw.shortBrand, "Lasting Qual"),
    logo: textOr(raw.logo, ""),
    languageMode: normalizeMode(raw.languageMode),
    defaultDescription: textOr(raw.defaultDescription, "Lasting Qual - 工业解决方案"),
    email: textOr(raw.email, "info@lastingqual.com"),
    phone: textOr(raw.phone, "+65 6789 1234"),
    addressLine1: textOr(raw.addressLine1, "123 Marina Bay Financial Centre,"),
    addressLine2: textOr(raw.addressLine2, "Singapore 018981"),
    copyrightYear: textOr(raw.copyrightYear, "2026"),
  };
}

export function getLanguagePolicy(settings = getSiteSettings()) {
  const mode = settings.languageMode;
  const defaultLang: Lang = mode === "en_zh" || mode === "en_only" ? "en" : "zh";
  return {
    mode,
    defaultLang,
    rootHref: `/${defaultLang}/`,
    hasZh: mode !== "en_only",
    hasEn: mode !== "zh_only",
    canSwitch: mode === "zh_en" || mode === "en_zh",
  };
}
