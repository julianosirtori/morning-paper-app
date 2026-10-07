import { create } from "zustand";

export type ViewId = "hoje" | "edicao" | "revisar" | "imprimir" | "fontes" | "preferencias";
export const VIEW_IDS: ViewId[] = ["hoje", "edicao", "revisar", "imprimir", "fontes", "preferencias"];

export const isViewId = (v: string): v is ViewId => (VIEW_IDS as string[]).includes(v);
const viewFromHash = (): ViewId => {
  const h = location.hash.slice(1);
  return isViewId(h) ? h : "hoje";
};

type GoOptions = { /** id de um bloco para rolar até ele e focar seu controle */ focus?: string; push?: boolean };

type NavigationState = {
  view: ViewId;
  /** Pedido de rolagem/foco após a troca de tela (n muda a cada navegação). */
  focusRequest: { id?: string; n: number };
  go: (view: ViewId, opt?: GoOptions) => void;
};

/** Navegação por hash (#hoje, #edicao…) — o voltar do sistema também funciona. */
export const useNavigation = create<NavigationState>()((set) => ({
  view: viewFromHash(),
  focusRequest: { n: 0 },
  go: (view, opt = {}) => {
    if (opt.push !== false && location.hash !== "#" + view) history.pushState({ v: view }, "", "#" + view);
    set((s) => ({ view, focusRequest: { id: opt.focus, n: s.focusRequest.n + 1 } }));
  },
}));

export const syncViewFromHash = () => useNavigation.getState().go(viewFromHash(), { push: false });
