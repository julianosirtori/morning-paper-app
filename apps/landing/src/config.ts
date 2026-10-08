// Dados do produto usados na página. A versão vem do package.json do app,
// então os links do release acompanham cada versão sem editar a landing.
import app from "@morning-paper/desktop/package.json";

export const VERSION = app.version;
/** Repositório no GitHub: vale para o link do código e para os downloads. */
export const REPO = "julianosirtori/morning-paper-app";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;
/** Página do release mais recente no GitHub, com todos os artefatos. */
export const RELEASE_URL = `${RELEASES_URL}/latest`;
/** Cópia do .dmg com nome fixo que o release.yml publica em cada release, além do arquivo com a versão no nome. */
export const DMG_NAME = "Morning.Paper_aarch64.dmg";
/** O GitHub resolve "latest" para o release mais recente, então o link não depende da versão desta build. */
export const DMG_URL = `${RELEASES_URL}/latest/download/${DMG_NAME}`;
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
