import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta na prévia do navegador (pnpm dev), que usa impressoras, IA e feeds de exemplo.
// O WebKit é o motor mais próximo do WKWebView que o Tauri usa no macOS.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:1420",
    locale: "pt-BR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1360, height: 880 } } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
