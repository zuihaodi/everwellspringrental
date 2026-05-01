import { loadNavByLang } from "../lib/content-loader";
import type { CmsNavItem, NavItem } from "../types/content";

type Lang = "zh" | "en";
type PageSlot = "page1" | "page2" | "page3" | "page4" | "page5";
type FixedNavItem = { key: PageSlot; order: number; label: string; href: string };

const KEY_ALIASES: Record<string, string> = {
  "关于我们": "page1",
  "产品与服务": "page2",
  "技术解决方案": "page3",
  "解决方案": "page3",
  "支持体系": "page3",
  "融资解决方案": "page4",
  "联系方式": "page5",
  "about us": "page1",
  "products & services": "page2",
  "technical solutions": "page3",
  "financing solutions": "page4",
  about: "page1",
  products: "page2",
  solutions: "page3",
  finance: "page4",
  contact: "page5",
};

const fixedZh: FixedNavItem[] = [
  { key: "page1", order: 1, label: "关于我们", href: "/zh/about" },
  { key: "page2", order: 2, label: "产品与服务", href: "/zh/business" },
  { key: "page3", order: 3, label: "技术解决方案", href: "/zh/solutions" },
  { key: "page4", order: 4, label: "融资解决方案", href: "/zh/finance" },
  { key: "page5", order: 5, label: "联系方式", href: "/zh/contact" },
];

const fixedEn: FixedNavItem[] = [
  { key: "page1", order: 1, label: "About Us", href: "/en/about" },
  { key: "page2", order: 2, label: "Products & Services", href: "/en/business" },
  { key: "page3", order: 3, label: "Technical Solutions", href: "/en/solutions" },
  { key: "page4", order: 4, label: "Financing Solutions", href: "/en/finance" },
  { key: "page5", order: 5, label: "Contact", href: "/en/contact" },
];

function isSafeHref(href: unknown, lang: Lang) {
  if (typeof href !== "string") return false;
  const base = lang === "zh" ? "/zh/" : "/en/";
  return href.startsWith(base) || href === "/zh" || href === "/en";
}

function normalizeKey(key: string) {
  const clean = key.replace(/^\d+[-_]?/, "").trim();
  const lower = clean.toLowerCase();
  return KEY_ALIASES[clean] || KEY_ALIASES[lower] || clean;
}

function buildFixedNav(lang: Lang): NavItem[] {
  const fixed = lang === "zh" ? fixedZh : fixedEn;
  const cmsItems = loadNavByLang(lang, { includeUnpublished: true });
  const cmsByKey = new Map<string, CmsNavItem>();
  const publishedByKey = new Map<string, boolean>();

  for (const item of cmsItems) {
    if (typeof item.key === "string" && item.key.trim()) {
      const key = normalizeKey(item.key);
      cmsByKey.set(key, item);
      publishedByKey.set(key, item.published !== false);
    }
  }

  const seenOrders = new Set<number>();
  return fixed
    .filter((base) => publishedByKey.get(base.key) === true)
    .map((base) => {
      const cms = cmsByKey.get(base.key);
      const label = typeof cms?.title === "string" && cms.title.trim() ? cms.title.trim() : base.label;
      const href = isSafeHref(cms?.href, lang) ? (cms.href as string) : base.href;
      let order = typeof cms?.order === "number" ? cms.order : base.order;
      if (!Number.isInteger(order) || order <= 0 || seenOrders.has(order)) {
        order = base.order;
      }
      seenOrders.add(order);
      return { label, href, order };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ label, href }) => ({ label, href }));
}

export function getNavZh(): NavItem[] {
  return buildFixedNav("zh");
}

export function getNavEn(): NavItem[] {
  return buildFixedNav("en");
}
