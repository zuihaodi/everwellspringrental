import { config, fields, singleton } from "@keystatic/core";

type PageKey = "page1" | "page2" | "page3" | "page4" | "page5";
type Lang = "zh" | "en";
const blankTokenHintZh = "填写 #blank# 可强制前台隐藏该项。";
const blankTokenHintEn = "Enter #blank# to force-hide this field on the frontend.";

function readEnv(...keys: string[]) {
  const processEnv =
    typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {};
  const viteEnv =
    typeof import.meta !== "undefined"
      ? ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {})
      : {};

  for (const key of keys) {
    const value = processEnv[key] ?? viteEnv[key];
    if (value) return value;
  }
  return undefined;
}

const mode = readEnv("NODE_ENV", "MODE");
const storageKind =
  readEnv("KEYSTATIC_STORAGE_KIND", "PUBLIC_KEYSTATIC_STORAGE_KIND") ??
  (mode === "production" ? "github" : "local");
const githubRepo =
  readEnv("KEYSTATIC_GITHUB_REPO", "PUBLIC_KEYSTATIC_GITHUB_REPO") ?? "";

const keystaticStorage =
  storageKind === "github"
    ? {
        kind: "github" as const,
        repo: githubRepo,
      }
    : { kind: "local" as const };

if (storageKind === "github" && !githubRepo) {
  throw new Error(
    "Missing KEYSTATIC_GITHUB_REPO when KEYSTATIC_STORAGE_KIND=github",
  );
}

function translationMetaField() {
  return fields.object(
    {
      mode: fields.select({
        label: "Translation Mode",
        options: [
          { label: "Auto", value: "auto" },
          { label: "Manual Locked (No Auto Overwrite)", value: "manual_locked" },
        ],
        defaultValue: "auto",
      }),
      status: fields.select({
        label: "Translation Status",
        options: [
          { label: "Synced", value: "synced" },
          { label: "Outdated (ZH Updated)", value: "outdated" },
          { label: "Error", value: "error" },
        ],
        defaultValue: "synced",
      }),
      sourceHash: fields.text({
        label: "ZH Source Hash",
        defaultValue: "",
        description: "Auto-maintained for source drift detection.",
      }),
      lastTranslatedAt: fields.text({
        label: "Last Translated At",
        defaultValue: "",
      }),
    },
    { label: "Translation Metadata" },
  );
}

function focusPositionField(label: string) {
  return fields.select({
    label,
    options: [
      { label: "Center", value: "center center" },
      { label: "Top", value: "center top" },
      { label: "Bottom", value: "center bottom" },
      { label: "Left", value: "left center" },
      { label: "Right", value: "right center" },
      { label: "Top Left", value: "left top" },
      { label: "Top Right", value: "right top" },
      { label: "Bottom Left", value: "left bottom" },
      { label: "Bottom Right", value: "right bottom" },
    ],
    defaultValue: "center center",
  });
}

function summarizeTitles(values: Array<string | undefined>, limit = 3) {
  const titles = values.map((value) => value?.trim()).filter((value): value is string => !!value);
  return titles.slice(0, limit).join("、");
}

function navSlotField(label: string, defaultTitle: string, defaultHref: string, defaultOrder: number) {
  return fields.object(
    {
      title: fields.text({ label: "Title", defaultValue: defaultTitle }),
      href: fields.text({
        label: "Public URL",
        defaultValue: defaultHref,
        description: "Public path used by the navigation link. Keep the language prefix, for example /zh/business or /en/business.",
      }),
      order: fields.integer({
        label: "Navigation Order",
        defaultValue: defaultOrder,
        description: "Controls menu position only. It does not move page content. Use unique numbers 1-5.",
      }),
      published: fields.checkbox({ label: "Published", defaultValue: true }),
    },
    { label },
  );
}

const navZh = singleton({
  label: "ZH - Navigation (5 fixed pages)",
  path: "src/content/nav/zh",
  format: { data: "json" },
  schema: {
    page1: navSlotField("Page 1 Content Slot", "关于我们", "/zh/about", 1),
    page2: navSlotField("Page 2 Content Slot", "产品与服务", "/zh/business", 2),
    page3: navSlotField("Page 3 Content Slot", "支持与保障", "/zh/solutions", 3),
    page4: navSlotField("Page 4 Content Slot", "融资解决方案", "/zh/finance", 4),
    page5: navSlotField("Page 5 Content Slot", "联系方式", "/zh/contact", 5),
  },
});

const navEn = singleton({
  label: "EN - Navigation (5 fixed pages)",
  path: "src/content/nav/en",
  format: { data: "json" },
  schema: {
    page1: navSlotField("Page 1 Content Slot", "About Us", "/en/about", 1),
    page2: navSlotField("Page 2 Content Slot", "Products & Services", "/en/business", 2),
    page3: navSlotField("Page 3 Content Slot", "Support & Assurance", "/en/solutions", 3),
    page4: navSlotField("Page 4 Content Slot", "Financing Solutions", "/en/finance", 4),
    page5: navSlotField("Page 5 Content Slot", "Contact Us", "/en/contact", 5),
  },
});

const homeZh = singleton({
  label: "ZH - Home Main Config",
  path: "src/content/home/zh",
  format: { data: "json" },
  schema: {
    hero: fields.object(
      {
        titleLine1: fields.text({ label: "\u4e3b\u6807\u9898\u7b2c\u4e00\u884c", description: blankTokenHintZh }),
        titleLine2: fields.text({ label: "\u4e3b\u6807\u9898\u7b2c\u4e8c\u884c", description: blankTokenHintZh }),
        subtitle: fields.text({ label: "\u9996\u5c4f\u526f\u6807\u9898", multiline: true, description: blankTokenHintZh }),
        buttonPrimaryText: fields.text({ label: "\u4e3b\u6309\u94ae\u6587\u6848" }),
        buttonPrimaryHref: fields.text({ label: "\u4e3b\u6309\u94ae\u94fe\u63a5", defaultValue: "/zh/business" }),
        buttonSecondaryText: fields.text({ label: "\u6b21\u6309\u94ae\u6587\u6848" }),
        buttonSecondaryHref: fields.text({ label: "\u6b21\u6309\u94ae\u94fe\u63a5", defaultValue: "/zh/contact" }),
        buttonTertiaryText: fields.text({ label: "\u7b2c\u4e09\u6309\u94ae\u6587\u6848", defaultValue: "" }),
        buttonTertiaryHref: fields.text({ label: "\u7b2c\u4e09\u6309\u94ae\u94fe\u63a5", defaultValue: "" }),
        buttonQuaternaryText: fields.text({ label: "\u7b2c\u56db\u6309\u94ae\u6587\u6848", defaultValue: "" }),
        buttonQuaternaryHref: fields.text({ label: "\u7b2c\u56db\u6309\u94ae\u94fe\u63a5", defaultValue: "" }),
        bgImage: fields.image({
          label: "\u9996\u5c4f\u80cc\u666f\u56fe",
          description: "\u5efa\u8bae 2560x1200\uff08\u6700\u4f4e 1920x900\uff09\uff0c\u6bd4\u4f8b 32:15\uff0c\u4e3b\u4f53\u5c45\u4e2d\u3002",
          directory: "public/uploads/home/zh",
          publicPath: "/uploads/home/zh/",
        }),
        bgImageFocus: focusPositionField("\u9996\u5c4f\u80cc\u666f\u7126\u70b9"),
      },
      { label: "\u9996\u5c4f\u533a\u57df" },
    ),
    metrics: fields.array(
      fields.object(
        {
          value: fields.text({ label: "\u6570\u503c" }),
          unit: fields.text({ label: "\u5355\u4f4d", defaultValue: "" }),
          desc: fields.text({ label: "\u63cf\u8ff0" }),
        },
        { label: "\u6307\u6807\u9879" },
      ),
      { label: "\u6838\u5fc3\u6307\u6807", itemLabel: (props) => props.fields.value.value || "\u6307\u6807\u9879" },
    ),
    businessSection: fields.object(
      {
        show: fields.checkbox({ label: "\u663e\u793a\u6838\u5fc3\u4e1a\u52a1\u533a\u5757", defaultValue: true }),
        title: fields.text({ label: "\u533a\u5757\u6807\u9898", description: blankTokenHintZh }),
        desc: fields.text({ label: "\u533a\u5757\u63cf\u8ff0", multiline: true, description: blankTokenHintZh }),
      },
      { label: "\u6838\u5fc3\u4e1a\u52a1\u533a\u57df" },
    ),
    cardsSection: fields.object(
      {
        show: fields.checkbox({ label: "\u663e\u793a\u5361\u7247\u533a\u57df", defaultValue: true }),
        cards: fields.array(
          fields.object(
            {
              title: fields.text({ label: "\u5361\u7247\u6807\u9898" }),
              summary: fields.text({ label: "\u5361\u7247\u6458\u8981", multiline: true }),
              image: fields.image({
                label: "\u5361\u7247\u56fe\u7247\u4e0a\u4f20",
                description: "\u5efa\u8bae 1600x900\uff08\u6216 1280x720\uff09\uff0c\u6bd4\u4f8b 16:9\uff0c\u5173\u952e\u5185\u5bb9\u653e\u5728\u4e2d\u95f4 60%\u533a\u57df\u3002",
                directory: "public/uploads/home/zh/cards",
                publicPath: "/uploads/home/zh/cards/",
              }),
              imageFocus: focusPositionField("\u5361\u7247\u56fe\u7247\u7126\u70b9"),
              ctaText: fields.text({ label: "\u6309\u94ae\u6587\u6848", defaultValue: "" }),
              ctaHref: fields.text({ label: "\u6309\u94ae\u94fe\u63a5", defaultValue: "" }),
              order: fields.integer({ label: "\u6392\u5e8f", defaultValue: 1 }),
              published: fields.checkbox({ label: "\u53d1\u5e03", defaultValue: true }),
            },
            { label: "\u5361\u7247\u9879" },
          ),
          { label: "\u9875\u9762\u5361\u7247", itemLabel: (props) => props.fields.title.value || "\u5361\u7247\u9879" },
        ),
      },
      { label: "\u5361\u7247\u533a\u57df" },
    ),
    bottomSection: fields.object(
      {
        show: fields.checkbox({ label: "\u663e\u793a\u5e95\u90e8\u6807\u9898\u533a", defaultValue: true }),
        bottomTitle: fields.text({ label: "\u5e95\u90e8\u6807\u9898", defaultValue: "" }),
        bottomSubtitle: fields.text({ label: "\u5e95\u90e8\u526f\u6807\u9898", multiline: true, defaultValue: "" }),
      },
      { label: "\u5e95\u90e8\u533a\u57df" },
    ),
    bottomListSection: fields.object(
      {
        show: fields.checkbox({ label: "\u663e\u793a\u5e95\u90e8\u5217\u8868", defaultValue: true }),
        bottomList: fields.array(
          fields.object(
            {
              title: fields.text({ label: "\u6807\u9898" }),
              summary: fields.text({ label: "\u6458\u8981", multiline: true }),
              order: fields.integer({ label: "\u6392\u5e8f", defaultValue: 1 }),
            },
            { label: "\u5e95\u90e8\u9879" },
          ),
          { label: "\u5e95\u90e8\u5217\u8868\u9879", itemLabel: (props) => props.fields.title.value || "\u5e95\u90e8\u9879" },
        ),
      },
      { label: "\u5e95\u90e8\u5217\u8868\u533a\u57df" },
    ),
    cta: fields.object(
      {
        show: fields.checkbox({ label: "\u663e\u793a\u8054\u7cfb\u533a\u57df", defaultValue: true }),
        title: fields.text({ label: "\u8054\u7cfb\u6807\u9898", description: blankTokenHintZh }),
        desc: fields.text({ label: "\u8054\u7cfb\u63cf\u8ff0", multiline: true, description: blankTokenHintZh }),
        buttonText: fields.text({ label: "\u6309\u94ae\u6587\u6848" }),
        buttonHref: fields.text({ label: "\u6309\u94ae\u94fe\u63a5", defaultValue: "/zh/contact" }),
      },
      { label: "\u8054\u7cfb\u533a\u57df" },
    ),
  },
});

const siteSettings = singleton({
  label: "Site Settings - 全站设置",
  path: "src/content/site/settings",
  format: { data: "json" },
  schema: {
    companyName: fields.text({
      label: "企业全称",
      defaultValue: "Lasting Qual Pte. Ltd.",
    }),
    shortBrand: fields.text({
      label: "企业简称",
      defaultValue: "Lasting Qual",
    }),
    logo: fields.image({
      label: "企业 Logo",
      description: "建议使用透明背景 PNG/SVG，横向 logo 高度建议不低于 96px。",
      directory: "public/uploads/site",
      publicPath: "/uploads/site/",
    }),
    languageMode: fields.select({
      label: "页面语言显示",
      options: [
        { label: "中英文（默认中文）", value: "zh_en" },
        { label: "英中文（默认英文）", value: "en_zh" },
        { label: "仅中文", value: "zh_only" },
        { label: "仅英文", value: "en_only" },
      ],
      defaultValue: "zh_en",
    }),
    defaultDescription: fields.text({
      label: "默认 SEO 描述",
      multiline: true,
      defaultValue: "Lasting Qual - 工业解决方案",
    }),
    email: fields.text({ label: "邮箱", defaultValue: "info@lastingqual.com" }),
    phone: fields.text({ label: "电话", defaultValue: "+65 6789 1234" }),
    addressLine1: fields.text({
      label: "地址第 1 行",
      defaultValue: "123 Marina Bay Financial Centre,",
    }),
    addressLine2: fields.text({
      label: "地址第 2 行",
      defaultValue: "Singapore 018981",
    }),
    copyrightYear: fields.text({ label: "版权年份", defaultValue: "2026" }),
  },
});

const homeEn = singleton({
  label: "EN - Home Main Config",
  path: "src/content/home/en",
  format: { data: "json" },
  schema: {
    hero: fields.object(
      {
        titleLine1: fields.text({ label: "Hero Title Line 1", description: blankTokenHintEn }),
        titleLine2: fields.text({ label: "Hero Title Line 2", description: blankTokenHintEn }),
        subtitle: fields.text({ label: "Hero Subtitle", multiline: true, description: blankTokenHintEn }),
        buttonPrimaryText: fields.text({ label: "Primary Button Text" }),
        buttonPrimaryHref: fields.text({ label: "Primary Button Href", defaultValue: "/en/business" }),
        buttonSecondaryText: fields.text({ label: "Secondary Button Text" }),
        buttonSecondaryHref: fields.text({ label: "Secondary Button Href", defaultValue: "/en/contact" }),
        buttonTertiaryText: fields.text({ label: "Tertiary Button Text", defaultValue: "" }),
        buttonTertiaryHref: fields.text({ label: "Tertiary Button Href", defaultValue: "" }),
        buttonQuaternaryText: fields.text({ label: "Quaternary Button Text", defaultValue: "" }),
        buttonQuaternaryHref: fields.text({ label: "Quaternary Button Href", defaultValue: "" }),
        bgImage: fields.image({
          label: "Hero Background",
          description: "Recommended 2560x1200 (min 1920x900), ratio 32:15, keep the subject centered.",
          directory: "public/uploads/home/en",
          publicPath: "/uploads/home/en/",
        }),
        bgImageFocus: focusPositionField("Hero Background Focus"),
      },
      { label: "Hero Section" },
    ),
    metrics: fields.array(
      fields.object(
        {
          value: fields.text({ label: "Value" }),
          unit: fields.text({ label: "Unit", defaultValue: "" }),
          desc: fields.text({ label: "Description" }),
        },
        { label: "Metric" },
      ),
      { label: "Core Metrics", itemLabel: (props) => props.fields.value.value || "Metric" },
    ),
    businessSection: fields.object(
      {
        show: fields.checkbox({ label: "Show Core Business", defaultValue: true }),
        title: fields.text({ label: "Section Title", description: blankTokenHintEn }),
        desc: fields.text({ label: "Section Description", multiline: true, description: blankTokenHintEn }),
      },
      { label: "Core Business Section" },
    ),
    cardsSection: fields.object(
      {
        show: fields.checkbox({ label: "Show Cards Section", defaultValue: true }),
        cards: fields.array(
          fields.object(
            {
              title: fields.text({ label: "Card Title" }),
              summary: fields.text({ label: "Card Summary", multiline: true }),
              image: fields.image({
                label: "Card Image Upload",
                description: "Recommended 1600x900 (or 1280x720), ratio 16:9, keep key content in the center 60% area.",
                directory: "public/uploads/home/en/cards",
                publicPath: "/uploads/home/en/cards/",
              }),
              imageFocus: focusPositionField("Card Focus"),
              ctaText: fields.text({ label: "CTA Text", defaultValue: "" }),
              ctaHref: fields.text({ label: "CTA Href", defaultValue: "" }),
              order: fields.integer({ label: "Order", defaultValue: 1 }),
              published: fields.checkbox({ label: "Published", defaultValue: true }),
            },
            { label: "Card Item" },
          ),
          { label: "Page Cards", itemLabel: (props) => props.fields.title.value || "Card Item" },
        ),
      },
      { label: "Cards Section" },
    ),
    bottomSection: fields.object(
      {
        show: fields.checkbox({ label: "Show Bottom Header", defaultValue: true }),
        bottomTitle: fields.text({ label: "Bottom Title", defaultValue: "" }),
        bottomSubtitle: fields.text({ label: "Bottom Subtitle", multiline: true, defaultValue: "" }),
      },
      { label: "Bottom Section" },
    ),
    bottomListSection: fields.object(
      {
        show: fields.checkbox({ label: "Show Bottom List", defaultValue: true }),
        bottomList: fields.array(
          fields.object(
            {
              title: fields.text({ label: "Title" }),
              summary: fields.text({ label: "Summary", multiline: true }),
              order: fields.integer({ label: "Order", defaultValue: 1 }),
            },
            { label: "Bottom Item" },
          ),
          { label: "Bottom List Items", itemLabel: (props) => props.fields.title.value || "Bottom Item" },
        ),
      },
      { label: "Bottom List Section" },
    ),
    cta: fields.object(
      {
        show: fields.checkbox({ label: "Show CTA Section", defaultValue: true }),
        title: fields.text({ label: "CTA Title", description: blankTokenHintEn }),
        desc: fields.text({ label: "CTA Description", multiline: true, description: blankTokenHintEn }),
        buttonText: fields.text({ label: "CTA Button Text" }),
        buttonHref: fields.text({ label: "CTA Button Href", defaultValue: "/en/contact" }),
      },
      { label: "CTA Section" },
    ),
    translation: translationMetaField(),
  },
});

function pageSchema(lang: Lang, page: PageKey) {
  const isZh = lang === "zh";
  const l = (zh: string, en: string) => (isZh ? zh : en);
  const pageCardsField = fields.array(
    fields.object(
      {
        title: fields.text({ label: l("卡片标题", "Card Title") }),
        summary: fields.text({ label: l("卡片摘要", "Card Summary"), multiline: true }),
        image: fields.image({
          label: l("卡片图片上传", "Card Image Upload"),
          description: l("建议 1200x700，比例 12:7，关键内容放在中间 60% 区域。", "Recommended 1200x700, ratio 12:7, keep key content in the center 60% area."),
          directory: `public/uploads/pages/${lang}/${page}/cards`,
          publicPath: `/uploads/pages/${lang}/${page}/cards/`,
        }),
        imageFocus: focusPositionField("Card Focus"),
        ctaText: fields.text({ label: l("按钮文案", "CTA Text"), defaultValue: "" }),
        ctaHref: fields.text({ label: l("按钮链接", "CTA Href"), defaultValue: "" }),
        order: fields.integer({ label: l("排序", "Order"), defaultValue: 1 }),
        published: fields.checkbox({ label: l("发布", "Published"), defaultValue: true }),
      },
      { label: l("卡片项", "Card Item") },
    ),
    {
      label: l("页面卡片", "Page Cards"),
      itemLabel: (props) => {
        const title = props.fields.title.value?.trim();
        const order = props.fields.order.value;
        return title ? `${order}. ${title}` : l(`卡片项 ${order}`, `Card ${order}`);
      },
    },
  );

  const schema: Record<string, any> = {
    heroSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示首屏", "Show Hero"), defaultValue: true }),
        heroTitle: fields.text({ label: l("页面标题", "Page Title"), description: l(blankTokenHintZh, blankTokenHintEn) }),
        heroSubtitle: fields.text({ label: l("页面副标题", "Page Subtitle"), multiline: true, description: l(blankTokenHintZh, blankTokenHintEn) }),
        heroBgImage: fields.image({
          label: l("背景图片（可选）", "Background Image (Optional)"),
          description: l("建议 1920x900，比例 32:15，主体居中。", "Recommended 1920x900, ratio 32:15, keep the subject centered."),
          directory: `public/uploads/pages/${lang}/${page}/hero`,
          publicPath: `/uploads/pages/${lang}/${page}/hero/`,
        }),
        heroBgFocus: focusPositionField("Background Focus"),
      },
      { label: l("首屏区域", "Hero Section") },
    ),
    mainSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示主体区块", "Show Main Section"), defaultValue: true }),
        sectionTitle: fields.text({ label: l("区块标题", "Section Title"), description: l(blankTokenHintZh, blankTokenHintEn) }),
        sectionBody: fields.text({ label: l("区块内容", "Section Body"), multiline: true, description: l(blankTokenHintZh, blankTokenHintEn) }),
        sectionPrimaryButtonText: fields.text({ label: l("主按钮文案", "Primary Button Text"), defaultValue: "" }),
        sectionPrimaryButtonHref: fields.text({ label: l("主按钮链接", "Primary Button Href"), defaultValue: "" }),
        sectionSecondaryButtonText: fields.text({ label: l("次按钮文案", "Secondary Button Text"), defaultValue: "" }),
        sectionSecondaryButtonHref: fields.text({ label: l("次按钮链接", "Secondary Button Href"), defaultValue: "" }),
        image: fields.image({
          label: l("主图上传", "Main Image Upload"),
          description: l("建议 1200x700，比例 12:7。", "Recommended 1200x700, ratio 12:7."),
          directory: `public/uploads/pages/${lang}/${page}`,
          publicPath: `/uploads/pages/${lang}/${page}/`,
        }),
        imageFocus: focusPositionField("Main Image Focus"),
      },
      { label: l("主体区域", "Main Section") },
    ),
    metricsSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示指标", "Show Metrics"), defaultValue: false }),
        metrics: fields.array(
          fields.object(
            {
              value: fields.text({ label: l("数值", "Value") }),
              unit: fields.text({ label: l("单位", "Unit"), defaultValue: "" }),
              desc: fields.text({ label: l("描述", "Description") }),
            },
            { label: l("指标项", "Metric Item") },
          ),
          { label: l("指标列表", "Metrics"), itemLabel: (props) => props.fields.value.value || l("指标", "Metric") },
        ),
      },
      { label: l("指标区域", "Metrics Section") },
    ),
    sectionGroups: fields.array(
      fields.object(
        {
          show: fields.checkbox({ label: l("显示该组合区", "Show This Group"), defaultValue: true }),
          title: fields.text({ label: l("组合标题", "Group Title"), defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
          subtitle: fields.text({ label: l("组合副标题", "Group Subtitle"), multiline: true, defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
          cards: pageCardsField,
        },
        { label: l("组合区块", "Section Group") },
      ),
      {
        label: l("中部区域 + 卡片区域组合", "Section Groups"),
        itemLabel: (props) => {
          const title = props.fields.title.value?.trim() || l("未命名组合", "Untitled Group");
          const cards = props.fields.cards.elements;
          const cardCount = cards.length;
          const cardSummary = summarizeTitles(cards.map((card) => card.fields.title.value));
          const countLabel = l(`${cardCount}张卡片`, `${cardCount} cards`);
          return cardSummary ? `${title} | ${countLabel} | ${cardSummary}` : `${title} | ${countLabel}`;
        },
      },
    ),
    middleSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示中部标题区", "Show Middle Header"), defaultValue: true }),
        middleTitle: fields.text({ label: l("中部标题", "Middle Title"), defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
        middleSubtitle: fields.text({ label: l("中部副标题", "Middle Subtitle"), multiline: true, defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
      },
      { label: l("中部区域", "Middle Section") },
    ),
    cardsSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示卡片区块", "Show Cards Section"), defaultValue: true }),
        cards: pageCardsField,
      },
      { label: l("卡片区域", "Cards Section") },
    ),
    bottomSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示底部标题区", "Show Bottom Header"), defaultValue: true }),
        bottomTitle: fields.text({ label: l("底部标题", "Bottom Title"), defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
        bottomSubtitle: fields.text({ label: l("底部副标题", "Bottom Subtitle"), multiline: true, defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
      },
      { label: l("底部区域", "Bottom Section") },
    ),
    bottomListSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示底部列表", "Show Bottom List"), defaultValue: true }),
        bottomList: fields.array(
          fields.object(
            {
              title: fields.text({ label: l("标题", "Title") }),
              summary: fields.text({ label: l("摘要", "Summary"), multiline: true }),
              order: fields.integer({ label: l("排序", "Order"), defaultValue: 1 }),
            },
            { label: l("底部项", "Bottom Item") },
          ),
          { label: l("底部列表项", "Bottom List Items"), itemLabel: (props) => props.fields.title.value || l("底部项", "Bottom Item") },
        ),
      },
      { label: l("底部列表区域", "Bottom List Section") },
    ),
    contactSection: fields.object(
      {
        show: fields.checkbox({ label: l("显示联系信息", "Show Contact Info"), defaultValue: false }),
        title: fields.text({ label: l("联系标题", "Contact Title"), defaultValue: "", description: l(blankTokenHintZh, blankTokenHintEn) }),
        addressLine1: fields.text({ label: l("地址第1行", "Address Line 1"), defaultValue: "" }),
        addressLine2: fields.text({ label: l("地址第2行", "Address Line 2"), defaultValue: "" }),
        email: fields.text({ label: l("邮箱", "Email"), defaultValue: "" }),
        phone: fields.text({ label: l("电话", "Phone"), defaultValue: "" }),
      },
      { label: l("联系区域", "Contact Section") },
    ),
  };

  if (!isZh) {
    schema.translation = translationMetaField();
  }

  return schema;
}

export default config({
  storage: keystaticStorage,
  singletons: {
    navZh,
    navEn,
    siteSettings,
    homeZh,
    homeEn,
    page1Zh: singleton({ label: "ZH - Page 1", path: "src/content/pages/zh/page1", format: { data: "json" }, schema: pageSchema("zh", "page1") }),
    page2Zh: singleton({ label: "ZH - Page 2", path: "src/content/pages/zh/page2", format: { data: "json" }, schema: pageSchema("zh", "page2") }),
    page3Zh: singleton({ label: "ZH - Page 3", path: "src/content/pages/zh/page3", format: { data: "json" }, schema: pageSchema("zh", "page3") }),
    page4Zh: singleton({ label: "ZH - Page 4", path: "src/content/pages/zh/page4", format: { data: "json" }, schema: pageSchema("zh", "page4") }),
    page5Zh: singleton({ label: "ZH - Page 5", path: "src/content/pages/zh/page5", format: { data: "json" }, schema: pageSchema("zh", "page5") }),
    page1En: singleton({ label: "EN - Page 1", path: "src/content/pages/en/page1", format: { data: "json" }, schema: pageSchema("en", "page1") }),
    page2En: singleton({ label: "EN - Page 2", path: "src/content/pages/en/page2", format: { data: "json" }, schema: pageSchema("en", "page2") }),
    page3En: singleton({ label: "EN - Page 3", path: "src/content/pages/en/page3", format: { data: "json" }, schema: pageSchema("en", "page3") }),
    page4En: singleton({ label: "EN - Page 4", path: "src/content/pages/en/page4", format: { data: "json" }, schema: pageSchema("en", "page4") }),
    page5En: singleton({ label: "EN - Page 5", path: "src/content/pages/en/page5", format: { data: "json" }, schema: pageSchema("en", "page5") }),
  },
});
