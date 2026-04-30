import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const uploadsRoot = path.join(root, "public", "uploads");

if (!fs.existsSync(uploadsRoot)) {
  console.log("No uploads directory found. Skipping.");
  process.exit(0);
}

const SOURCE_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);

const presets = {
  home: { width: 1920, height: 900 },
  products: { width: 960, height: 600 },
  finance: { width: 960, height: 600 },
  pages: { width: 1200, height: 700 },
  default: { width: 960, height: 600 },
};

function pickPreset(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/home/")) return presets.home;
  if (normalized.includes("/products/")) return presets.products;
  if (normalized.includes("/finance/")) return presets.finance;
  if (normalized.includes("/pages/")) return presets.pages;
  return presets.default;
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (name.includes(".tmp.")) continue;
    const ext = path.extname(name).toLowerCase();
    if (!SOURCE_IMAGE_EXT.has(ext)) continue;
    out.push(full);
  }
  return out;
}

async function processImage(file) {
  const preset = pickPreset(file);
  const noExt = file.replace(/\.[^/.]+$/, "");
  const webpMain = `${noExt}.webp`;
  const webpSmall = `${noExt}.sm.webp`;

  // Keep crop deterministic across local/dev and Cloudflare builds.
  await sharp(file)
    .resize(preset.width, preset.height, { fit: "cover", position: "center" })
    .webp({ quality: 82 })
    .toFile(webpMain);

  await sharp(file)
    .resize(Math.round(preset.width * 0.5), Math.round(preset.height * 0.5), { fit: "cover", position: "center" })
    .webp({ quality: 78 })
    .toFile(webpSmall);

  return { file, webpMain, webpSmall };
}

(async () => {
  const files = walk(uploadsRoot);
  if (!files.length) {
    console.log("No upload images to process.");
    return;
  }
  let ok = 0;
  for (const file of files) {
    try {
      const result = await processImage(file);
      ok += 1;
      console.log(`Processed: ${path.relative(root, result.webpMain)} | ${path.relative(root, result.webpSmall)}`);
    } catch (err) {
      console.error(`Failed: ${file}`, err);
    }
  }
  console.log(`Done. ${ok}/${files.length} images processed.`);
})();
