import process from "node:process";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const CHINESE_RE = /[\u3400-\u9fff]/;
const LATIN_RE = /[A-Za-z]/;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isMixedZhEn(text) {
  return typeof text === "string" && CHINESE_RE.test(text) && LATIN_RE.test(text);
}

export function hasChinese(text) {
  return typeof text === "string" && CHINESE_RE.test(text);
}

export function getTranslatorConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || "",
    baseUrl: (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 45000),
    batchSize: Number(process.env.OPENAI_TRANSLATE_BATCH || 16),
  };
}

export async function checkOpenAIAvailability() {
  const cfg = getTranslatorConfig();
  if (!cfg.apiKey) {
    return { ok: false, reason: "missing_api_key", config: cfg };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}`, config: cfg };
    }
    return { ok: true, reason: "ok", config: cfg };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? "timeout" : "network_error", error: String(error), config: cfg };
  } finally {
    clearTimeout(timer);
  }
}

export async function translateStringsWithOpenAI(items, contextText = "") {
  const cfg = getTranslatorConfig();
  if (!cfg.apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const result = new Map();
  const batches = chunk(items, Math.max(1, cfg.batchSize));

  for (const batch of batches) {
    const indexed = batch.map((item, i) => ({ i, text: item.text }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    const system = [
      "You are a professional website localization translator.",
      "Translate Simplified Chinese to natural business English.",
      "Rules:",
      "1) Keep brand names, numbers, units, URLs, and acronyms unchanged.",
      "2) Keep line breaks and markdown symbols if present.",
      "3) Return only valid JSON object.",
      "4) Output key must be stringified index: '0','1',...",
    ].join("\n");

    const user = JSON.stringify({
      task: "translate_zh_to_en",
      context: contextText,
      items: indexed,
    });

    let payload;
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 300)}`);
      }

      payload = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const content = payload?.choices?.[0]?.message?.content;
    const json = parseJson(content);
    if (!json || typeof json !== "object") {
      throw new Error("OpenAI response is not valid JSON object");
    }

    batch.forEach((item, idx) => {
      const translated = json[String(idx)];
      result.set(item.id, typeof translated === "string" && translated.trim() ? translated.trim() : item.text);
    });
  }

  return result;
}
