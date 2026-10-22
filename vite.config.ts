/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Social cards need absolute URLs. Use SITE_URL when set, otherwise the
 * production URL that Vercel, Netlify, or Cloudflare Pages provide at build
 * time. Locally this is empty, so tags fall back to relative paths.
 */
function siteUrl(env: Record<string, string>): string {
  const url =
    env.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (env.NETLIFY && env.URL) ||
    env.CF_PAGES_URL ||
    "";
  return url.replace(/\/+$/, "");
}

export default defineConfig(({ mode }) => {
  const site = siteUrl(loadEnv(mode, ".", ""));
  return {
    plugins: [react(), { name: "site-url", transformIndexHtml: (html: string) => html.replaceAll("%SITE_URL%", site) }],
    test: {
      include: ["src/**/*.test.ts"],
    },
  };
});
