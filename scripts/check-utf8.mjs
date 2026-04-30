import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const utf8 = new TextDecoder("utf-8", { fatal: true });
const targets = [
  { dir: "src/pages", exts: [".astro"] },
  { dir: "src/content", exts: [".json"] },
];

function walk(dir, exts) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(abs, exts));
      continue;
    }
    if (exts.includes(path.extname(entry.name))) {
      result.push(abs);
    }
  }
  return result;
}

const failures = [];

for (const target of targets) {
  const absDir = path.join(root, target.dir);
  if (!fs.existsSync(absDir)) continue;
  const files = walk(absDir, target.exts);
  for (const file of files) {
    const rel = path.relative(root, file);
    const buf = fs.readFileSync(file);
    try {
      utf8.decode(buf);
    } catch {
      failures.push(rel);
    }
  }
}

if (failures.length > 0) {
  console.error("UTF-8 check failed. Non UTF-8 files:");
  for (const file of failures) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("UTF-8 check passed.");
