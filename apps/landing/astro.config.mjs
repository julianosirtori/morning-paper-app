// @ts-check
import { defineConfig } from "astro/config";

// No GitHub Actions, GITHUB_REPOSITORY vem como "dono/repositorio".
// Fora do CI, usa o repositório padrão do projeto.
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "julianosirtori/morning-paper-app").split("/");
const isUserSite = repo === `${owner}.github.io`;

export default defineConfig({
  site: process.env.SITE_URL ?? `https://${owner}.github.io`,
  base: process.env.BASE_PATH ?? (isUserSite ? "/" : `/${repo}`),
  trailingSlash: "ignore",
});
