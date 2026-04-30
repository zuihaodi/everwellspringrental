import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, "src");
const EXTENSIONS = new Set([".astro", ".ts", ".json"]);
const GARBLED_MARKERS = ["銆", "锛", "鈥", "浜嗚", "鏍稿", "铻嶈", "鑷村姏浜庢帹鍔"];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs));
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs);
  }
  return out;
}

const files = walk(TARGET_DIR);
const issues = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");

  for (const marker of GARBLED_MARKERS) {
    if (text.includes(marker)) {
      issues.push(`[garbled-marker] ${rel} contains "${marker}"`);
      break;
    }
  }

  if (file.endsWith(".json")) {
    try {
      JSON.parse(text);
    } catch (err) {
      issues.push(`[invalid-json] ${rel}: ${err.message}`);
    }
  }
}

if (issues.length) {
  console.error("Detected encoding/content issues:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("No garbled markers or JSON parse errors found.");
