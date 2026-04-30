import { loadNavByLang } from "../lib/content-loader";
import type { CmsNavItem, NavItem } from "../types/content";

type Lang = "zh" | "en";
type FixedNavItem = { key: string; order: number; label: string; href: string };
// Canonical semantic keys: see docs/CANONICAL_SEMANTICS.md
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

const fixedZh: FixedNavItem[] = [
  { key: "about", order: 1, label: "关于我们", href: "/zh/about" },
  { key: "products", order: 2, label: "产品与服务", href: "/zh/products" },
  { key: "solutions", order: 3, label: "技术解决方案", href: "/zh/solutions" },
  { key: "finance", order: 4, label: "融资解决方案", href: "/zh/finance" },
  { key: "contact", order: 5, label: "联系方式", href: "/zh/contact" },
];

const fixedEn: FixedNavItem[] = [
  { key: "about", order: 1, label: "About Us", href: "/en/about" },
  { key: "products", order: 2, label: "Products & Services", href: "/en/products" },
  { key: "solutions", order: 3, label: "Technical Solutions", href: "/en/solutions" },
  { key: "finance", order: 4, label: "Financing Solutions", href: "/en/finance" },
  { key: "contact", order: 5, label: "Contact", href: "/en/contact" },
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
  const cmsItems = loadNavByLang(lang);
  const cmsByKey = new Map<string, CmsNavItem>();

  for (const item of cmsItems) {
    if (typeof item.key === "string" && item.key.trim()) {
      cmsByKey.set(normalizeKey(item.key), item);
    }
  }

  const seenOrders = new Set<number>();
  return fixed
    .map((base) => {
      const cms = cmsByKey.get(base.key);
      const label = typeof cms?.title === "string" && cms.title.trim() ? cms.title.trim() : base.label;
      const href = isSafeHref(cms?.href, lang) ? (cms?.href as string) : base.href;
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


