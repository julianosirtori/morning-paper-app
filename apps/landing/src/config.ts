// Dados do produto usados na página. A versão vem do package.json do app,
// então os links do release acompanham cada versão sem editar a landing.
import app from "@morning-paper/desktop/package.json";

export const VERSION = app.version;
/** Troque aqui quando o repositório for publicado: vale para o link do GitHub e para os downloads. */
export const REPO = "julianosirtori/morning-paper-app";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;
/** Página do release desta versão no GitHub, com todos os artefatos. */
export const RELEASE_URL = `${RELEASES_URL}/tag/v${VERSION}`;
/** O Tauri gera "Morning Paper_<versão>_aarch64.dmg"; o GitHub troca o espaço por ponto. */
export const DMG_NAME = `Morning.Paper_${VERSION}_aarch64.dmg`;
/** Artefato do release (o mesmo que o workflow release.yml publica). */
export const DMG_URL = `${RELEASES_URL}/download/v${VERSION}/${DMG_NAME}`;
export const MIN_MACOS = 11;

/** Base do site (no GitHub Pages, "/<repositório>/"), sempre com a barra final. */
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const DOWNLOADS_URL = `${BASE}downloads/`;

export const NAV = [
  { href: `${BASE}#como-funciona`, label: "Como funciona" },
  { href: `${BASE}#estilos`, label: "Estilos" },
  { href: `${BASE}#controle`, label: "Privacidade" },
  { href: `${BASE}#perguntas`, label: "Perguntas" },
];
