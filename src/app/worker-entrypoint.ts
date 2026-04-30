import { App } from "astro/app";
import { handle } from "@astrojs/cloudflare/handler";

export function createExports(manifest: unknown) {
  // Force non-streaming SSR for Cloudflare runtime isolation.
  const app = new App(manifest as any, false);

  return {
    default: {
      fetch: async (request: Request, env: unknown, context: ExecutionContext) => {
        return handle(manifest as any, app, request, env as any, context);
      },
    },
  };
}
