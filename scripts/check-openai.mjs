import { checkOpenAIAvailability } from "./translator-openai.mjs";

const proxyState = {
  HTTP_PROXY: process.env.HTTP_PROXY || "",
  HTTPS_PROXY: process.env.HTTPS_PROXY || "",
  ALL_PROXY: process.env.ALL_PROXY || "",
};

const result = await checkOpenAIAvailability();
if (result.ok) {
  console.log(`[openai:check] ok model=${result.config.model} base=${result.config.baseUrl}`);
  process.exit(0);
}

console.error(`[openai:check] fail reason=${result.reason} model=${result.config.model} base=${result.config.baseUrl}`);
if (result.error) console.error(`[openai:check] detail=${result.error}`);
if (proxyState.HTTP_PROXY || proxyState.HTTPS_PROXY || proxyState.ALL_PROXY) {
  console.error(`[openai:check] proxy HTTP_PROXY=${proxyState.HTTP_PROXY} HTTPS_PROXY=${proxyState.HTTPS_PROXY} ALL_PROXY=${proxyState.ALL_PROXY}`);
}
process.exit(2);
