// Descobre em que computador a página foi aberta, para mostrar o download certo.
// O instalador existe só para macOS 11+ em Macs com chip Apple (aarch64).

export type OS = "mac" | "windows" | "linux" | "chromeos" | "ios" | "android" | "other";
export type Arch = "arm" | "x86" | "unknown";

export type Env = {
  os: OS;
  arch: Arch;
  /** Versão do macOS, quando o navegador informa (Chrome/Edge). O Safari congela em 10.15.7. */
  macVersion?: number;
};

/** ok: pode baixar · maybe: é Mac, mas não dá para saber o chip · no: não roda aqui */
export type Verdict = "ok" | "maybe" | "no";

type UAData = {
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; platformVersion?: string }>;
};

function detectOS(): OS {
  const ua = navigator.userAgent;
  const platform = ((navigator as Navigator & { userAgentData?: UAData }).userAgentData?.platform ?? "").toLowerCase();
  // O iPad se apresenta como Mac; a tela de toque denuncia.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua) || platform === "android") return "android";
  if (/CrOS/.test(ua) || platform === "chrome os" || platform === "chromeos") return "chromeos";
  if (/Macintosh|Mac OS X/.test(ua) || platform === "macos") return "mac";
  if (/Windows/.test(ua) || platform === "windows") return "windows";
  if (/Linux|X11/.test(ua) || platform === "linux") return "linux";
  return "other";
}

/** No Safari não há Client Hints; o nome da placa de vídeo no WebGL às vezes revela o chip. */
function archFromWebGL(): Arch {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    if (/Apple M\d/i.test(renderer)) return "arm";
    if (/Intel|AMD|Radeon|NVIDIA/i.test(renderer)) return "x86";
  } catch {
    /* sem WebGL: fica desconhecido */
  }
  return "unknown";
}

/** Simula outro computador com ?platform=windows|linux|chromeos|ios|android|mac|mac-intel|mac-unknown (QA e testes e2e). */
function forcedEnv(): Env | undefined {
  const p = new URLSearchParams(location.search).get("platform");
  if (!p) return undefined;
  if (p === "mac") return { os: "mac", arch: "arm" };
  if (p === "mac-intel") return { os: "mac", arch: "x86" };
  if (p === "mac-unknown") return { os: "mac", arch: "unknown" };
  const os = p as OS;
  return Object.keys(OS_NAMES).includes(os) ? { os, arch: "unknown" } : undefined;
}

export async function detectEnv(): Promise<Env> {
  const forced = forcedEnv();
  if (forced) return forced;
  const os = detectOS();
  if (os !== "mac") return { os, arch: "unknown" };

  const uad = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (uad?.getHighEntropyValues) {
    try {
      const v = await uad.getHighEntropyValues(["architecture", "platformVersion"]);
      const arch: Arch = v.architecture === "arm" ? "arm" : v.architecture === "x86" ? "x86" : "unknown";
      const macVersion = v.platformVersion ? Number.parseInt(v.platformVersion, 10) : undefined;
      return { os, arch: arch === "unknown" ? archFromWebGL() : arch, macVersion };
    } catch {
      /* segue para o WebGL */
    }
  }
  return { os, arch: archFromWebGL() };
}

export function verdictOf(env: Env, minMacOS: number): Verdict {
  if (env.os !== "mac") return "no";
  if (env.arch === "x86") return "no";
  if (env.macVersion !== undefined && env.macVersion < minMacOS) return "no";
  return env.arch === "arm" ? "ok" : "maybe";
}

const OS_NAMES: Record<OS, string> = {
  mac: "Mac",
  windows: "Windows",
  linux: "Linux",
  chromeos: "Chromebook",
  ios: "iPhone ou iPad",
  android: "Android",
  other: "este aparelho",
};

/** Descrição curta do aparelho, como "Mac com chip Apple · macOS 14". */
export function describeEnv(env: Env): string {
  if (env.os !== "mac") return OS_NAMES[env.os];
  const chip = env.arch === "arm" ? "Mac com chip Apple" : env.arch === "x86" ? "Mac com processador Intel" : "Mac";
  return env.macVersion ? `${chip} · macOS ${env.macVersion}` : chip;
}

/** Por que não dá para instalar aqui, e o que fazer. Só para o veredito "no". */
export function reasonOf(env: Env, minMacOS: number): string {
  if (env.os === "mac" && env.arch === "x86")
    return "Por enquanto, o Morning Paper só roda em Macs com chip Apple (M1 ou mais recente).";
  if (env.os === "mac") return `O Morning Paper precisa do macOS ${minMacOS} ou mais recente. Atualize o sistema em Ajustes do Sistema › Geral › Atualização de Software.`;
  if (env.os === "ios" || env.os === "android")
    return "O Morning Paper é um app para Mac. Copie o link e abra no seu computador.";
  return `O Morning Paper é um app para Mac e ainda não tem versão para ${OS_NAMES[env.os]}. Copie o link para abrir no seu Mac.`;
}

/** Aviso curto para o hero, ao lado do botão "Ver downloads". */
export function shortReasonOf(env: Env, minMacOS: number): string {
  if (env.os === "mac" && env.arch === "x86") return "Este Mac tem processador Intel; por enquanto, o Morning Paper roda só em Macs com chip Apple.";
  if (env.os === "mac") return `O Morning Paper precisa do macOS ${minMacOS} ou mais recente.`;
  return `Você está usando ${OS_NAMES[env.os]}; por enquanto, o Morning Paper é só para Mac.`;
}
