#!/usr/bin/env node
// Lança uma versão nova: sobe a versão em todos os arquivos, fecha o CHANGELOG, faz o commit,
// cria a tag e envia. O push da tag dispara o workflow release.yml, que publica o .dmg.
//
//   pnpm release patch|minor|major|X.Y.Z [--dry-run] [--yes]
//
// --dry-run mostra o que mudaria sem tocar em nada; --yes não pede confirmação antes do push.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const yes = args.includes("--yes");
const bump = args.find((a) => !a.startsWith("--"));

const FILES = {
  pkg: "apps/desktop/package.json",
  tauri: "apps/desktop/src-tauri/tauri.conf.json",
  cargo: "apps/desktop/src-tauri/Cargo.toml",
  lock: "apps/desktop/src-tauri/Cargo.lock",
  changelog: "CHANGELOG.md",
};

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
}

const read = (file) => readFileSync(join(root, file), "utf8");

/** Troca exatamente uma ocorrência; se o padrão não bater, o arquivo mudou de formato e é melhor parar. */
function replaceOnce(file, text, pattern, replacement) {
  if (!pattern.test(text)) fail(`Não achei a versão em ${file}.`);
  return text.replace(pattern, replacement);
}

function nextVersion(current, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [major, minor, patch] = current.split(".").map(Number);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  fail("Uso: pnpm release patch|minor|major|X.Y.Z [--dry-run] [--yes]");
}

const isNewer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

if (!bump) nextVersion("0.0.0", "");

const current = JSON.parse(read(FILES.pkg)).version;
const version = nextVersion(current, bump);
const tag = `v${version}`;
if (!isNewer(version, current)) fail(`A versão nova (${version}) precisa ser maior que a atual (${current}).`);

// Estado do git: na main, sem mudanças pendentes, em dia com o remoto e sem a tag.
if (git("branch", "--show-current") !== "main") fail("Lance a partir da main.");
if (git("status", "--porcelain")) {
  const message = "Há mudanças não commitadas. Faça commit ou stash antes.";
  if (dryRun) console.warn(`! ${message}`);
  else fail(message);
}
git("fetch", "--quiet", "--tags", "origin");
if (git("rev-list", "--count", "HEAD..origin/main") !== "0") fail("A main local está atrás da origin/main. Rode git pull.");
if (git("tag", "--list", tag)) fail(`A tag ${tag} já existe.`);

// Arquivos com a versão.
// Data local no formato AAAA-MM-DD (o sueco usa esse formato).
const today = new Date().toLocaleDateString("sv-SE");
const edits = {
  [FILES.pkg]: replaceOnce(FILES.pkg, read(FILES.pkg), /("version":\s*")[^"]+(")/, `$1${version}$2`),
  [FILES.tauri]: replaceOnce(FILES.tauri, read(FILES.tauri), /("version":\s*")[^"]+(")/, `$1${version}$2`),
  [FILES.cargo]: replaceOnce(FILES.cargo, read(FILES.cargo), /^(version\s*=\s*")[^"]+(")/m, `$1${version}$2`),
  [FILES.lock]: replaceOnce(FILES.lock, read(FILES.lock), /(name = "morning-paper"\nversion = ")[^"]+(")/, `$1${version}$2`),
};

// CHANGELOG: o que estava em "Não lançado" vira a seção da versão nova.
let changelog = read(FILES.changelog);
const unreleased = changelog.match(/## \[Não lançado\]\n([\s\S]*?)(?=\n## \[)/);
if (!unreleased) fail(`Não achei a seção "## [Não lançado]" em ${FILES.changelog}.`);
if (!unreleased[1].trim()) console.warn(`! A seção "Não lançado" do CHANGELOG está vazia; a ${tag} vai sair sem notas.`);
changelog = changelog.replace("## [Não lançado]\n", `## [Não lançado]\n\n## [${version}] - ${today}\n`);
changelog = replaceOnce(
  FILES.changelog,
  changelog,
  /^\[Não lançado\]: (.+\/compare\/)v[^.]+\.[^.]+\.[^.]+\.\.\.HEAD$/m,
  `[Não lançado]: $1${tag}...HEAD\n[${version}]: $1v${current}...${tag}`,
);
edits[FILES.changelog] = changelog;

console.log(`Versão ${current} → ${version}`);
for (const file of Object.keys(edits)) console.log(`  · ${file}`);
console.log(`Commit "Release ${tag}", tag ${tag} e push da main e da tag para a origin.`);

if (dryRun) {
  console.log("\n--dry-run: nada foi alterado.");
  process.exit(0);
}

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("\nPublicar? O push da tag dispara o release no GitHub. [s/N] ");
  rl.close();
  if (!/^s(im)?$/i.test(answer.trim())) fail("Cancelado. Nada foi alterado.");
}

for (const [file, text] of Object.entries(edits)) writeFileSync(join(root, file), text);
git("add", ...Object.keys(edits));
git("commit", "--quiet", "-m", `Release ${tag}`);
git("tag", "-a", tag, "-m", `Morning Paper ${tag}`);
// --atomic: ou a main e a tag sobem juntas, ou nenhuma sobe.
git("push", "--atomic", "--quiet", "origin", "main", tag);

const repo = git("remote", "get-url", "origin").replace(/^git@github\.com:|^https:\/\/github\.com\//, "").replace(/\.git$/, "");
console.log(`\n✓ ${tag} enviada. Acompanhe o build em https://github.com/${repo}/actions/workflows/release.yml`);
