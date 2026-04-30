import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EXACT_TEXT_MAP, KEY_ALIASES, NAV_SEMANTIC_EN, PHRASE_MAP } from "./translation-glossary.mjs";
import { checkOpenAIAvailability, hasChinese, isMixedZhEn, translateStringsWithOpenAI } from "./translator-openai.mjs";

const FORCE = process.argv.includes("--force");
const DRY_CHECK = process.argv.includes("--check");
const ROOT = process.cwd();

const CONTENT_PAIRS = [
  { kind: "nav", zh: "src/content/nav/zh", en: "src/content/nav/en" },
  { kind: "pages", zh: "src/content/pages/zh", en: "src/content/pages/en" },
  { kind: "home", zhFile: "src/content/home/zh.json", enFile: "src/content/home/en.json" },
];

const NON_TRANSLATE_FIELDS = new Set(["key", "pageKey", "translation"]);

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function hasText(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}

function sourceHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex").slice(0, 16);
}

function normalizeSemantic(raw) {
  if (typeof raw !== "string") return "";
  const clean = raw.replace(/^\d+[-_]?/, "").trim();
  const lower = clean.toLowerCase();
  return KEY_ALIASES[clean] || KEY_ALIASES[lower] || lower;
}

function mapHref(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^\/zh(?=\/|$)/, "/en");
}

function directTranslate(text, kind, semantic) {
  if (!hasChinese(text)) return text;
  if (kind === "nav" && semantic && NAV_SEMANTIC_EN[semantic]) return NAV_SEMANTIC_EN[semantic];
  if (EXACT_TEXT_MAP[text]) return EXACT_TEXT_MAP[text];

  let out = text;
  for (const key of Object.keys(PHRASE_MAP).sort((a, b) => b.length - a.length)) {
    if (out.includes(key)) out = out.split(key).join(PHRASE_MAP[key]);
  }
  return out;
}

function collectCandidates(node, oldNode, opts, pathName = "", parentKey = "") {
  const rows = [];

  if (Array.isArray(node)) {
    node.forEach((item, idx) => {
      rows.push(...collectCandidates(item, Array.isArray(oldNode) ? oldNode[idx] : undefined, opts, `${pathName}[${idx}]`, parentKey));
    });
    return rows;
  }

  if (isObject(node)) {
    Object.entries(node).forEach(([key, value]) => {
      if (NON_TRANSLATE_FIELDS.has(key)) return;
      const prev = isObject(oldNode) ? oldNode[key] : undefined;
      rows.push(...collectCandidates(value, prev, opts, pathName ? `${pathName}.${key}` : key, key));
    });
    return rows;
  }

  if (typeof node === "string") {
    if (NON_TRANSLATE_FIELDS.has(parentKey)) return rows;
    if (parentKey === "href" || parentKey.endsWith("Href")) {
      rows.push({ path: pathName, type: "href", value: node });
      return rows;
    }
    if (["image", "cover", "bgImage", "heroBgImage", "legacyImage"].includes(parentKey)) {
      rows.push({ path: pathName, type: "passthrough", value: node, oldValue: typeof oldNode === "string" ? oldNode : "" });
      return rows;
    }

    const semantic = opts.kind === "nav" ? normalizeSemantic(opts.semanticRaw || "") : "";
    const pre = directTranslate(node, opts.kind, semantic);
    const oldValue = typeof oldNode === "string" ? oldNode : "";

    rows.push({
      path: pathName,
      type: "text",
      value: node,
      oldValue,
      pre,
      needLLM: hasChinese(pre),
    });
  }

  return rows;
}

function setByPath(target, pathExpr, value) {
  const parts = pathExpr.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

function mergeTranslationMeta(existingMeta, hash, status, shouldSetTime) {
  const mode = existingMeta?.mode === "manual_locked" ? "manual_locked" : "auto";
  return {
    mode,
    sourceHash: hash,
    status,
    lastTranslatedAt: shouldSetTime ? new Date().toISOString() : existingMeta?.lastTranslatedAt || "",
  };
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((n) => n.endsWith(".json"));
}

async function syncRecord({ kind, zhPath, enPath, fileStem }) {
  const zhData = readJson(zhPath);
  if (!isObject(zhData)) return { updated: false, skipped: true, reason: "invalid_zh", enPath };

  const existingEn = readJson(enPath);
  const existingMeta = isObject(existingEn?.translation) ? existingEn.translation : {};
  const mode = existingMeta.mode === "manual_locked" ? "manual_locked" : "auto";

  const zhHash = sourceHash(zhData);
  const sameHash = existingMeta.sourceHash === zhHash;

  if (mode === "manual_locked" && !FORCE) {
    const nextStatus = sameHash ? "synced" : "outdated";
    const next = isObject(existingEn) ? { ...existingEn } : {};
    next.translation = mergeTranslationMeta(existingMeta, zhHash, nextStatus, false);
    if (JSON.stringify(existingEn) !== JSON.stringify(next) && !DRY_CHECK) writeJson(enPath, next);
    return { updated: JSON.stringify(existingEn) !== JSON.stringify(next), skipped: false, reason: "locked_meta_updated", enPath };
  }

  const semanticRaw = isObject(zhData) ? (zhData.key || zhData.href || zhData.title || fileStem) : fileStem;
  const translated = JSON.parse(JSON.stringify(zhData));
  const candidates = collectCandidates(zhData, existingEn, { kind, semanticRaw });

  const llmItems = [];
  candidates.forEach((c, idx) => {
    if (c.type === "href") {
      setByPath(translated, c.path, mapHref(c.value));
      return;
    }
    if (c.type === "passthrough") {
      setByPath(translated, c.path, hasText(c.oldValue) ? c.oldValue : c.value);
      return;
    }
    if (!c.needLLM) {
      setByPath(translated, c.path, c.pre);
      return;
    }
    llmItems.push({ id: String(idx), text: c.pre, path: c.path, oldValue: c.oldValue });
  });

  if (llmItems.length > 0) {
    const result = await translateStringsWithOpenAI(
      llmItems.map((i) => ({ id: i.id, text: i.text })),
      `kind=${kind}; file=${fileStem}`,
    );

    llmItems.forEach((item) => {
      const nextText = result.get(item.id) || item.text;
      const chosen = !hasChinese(nextText) && !isMixedZhEn(nextText)
        ? nextText
        : (!hasChinese(item.oldValue) && !isMixedZhEn(item.oldValue) && item.oldValue ? item.oldValue : nextText);
      setByPath(translated, item.path, chosen);
    });
  }

  translated.translation = mergeTranslationMeta(existingMeta, zhHash, "synced", true);

  const changed = JSON.stringify(existingEn) !== JSON.stringify(translated);
  if (changed && !DRY_CHECK) writeJson(enPath, translated);
  return { updated: changed, skipped: !changed, reason: changed ? "translated" : "no_change", enPath };
}

async function run() {
  const health = await checkOpenAIAvailability();
  if (!health.ok) {
    console.error(`[content:translate] OpenAI unavailable: ${health.reason}`);
    process.exit(2);
  }

  const logs = [];

  for (const pair of CONTENT_PAIRS) {
    if (pair.kind === "home") {
      logs.push(await syncRecord({ kind: "home", zhPath: path.resolve(ROOT, pair.zhFile), enPath: path.resolve(ROOT, pair.enFile), fileStem: "home" }));
      continue;
    }

    const zhDir = path.resolve(ROOT, pair.zh);
    const enDir = path.resolve(ROOT, pair.en);
    for (const name of listJsonFiles(zhDir)) {
      logs.push(await syncRecord({ kind: pair.kind, zhPath: path.join(zhDir, name), enPath: path.join(enDir, name), fileStem: name.replace(/\.json$/i, "") }));
    }
  }

  const updated = logs.filter((i) => i.updated).length;
  const skipped = logs.filter((i) => i.skipped).length;
  console.log(`[content:translate] total=${logs.length} updated=${updated} skipped=${skipped} force=${FORCE} check=${DRY_CHECK}`);
}

run().catch((error) => {
  console.error(`[content:translate] failed: ${error?.message || error}`);
  process.exit(1);
});
