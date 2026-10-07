import { create } from "zustand";

export type Toast = { id: number; msg: string; tone?: "err"; leaving?: boolean };

type ToastState = { toasts: Toast[]; push: (msg: string, tone?: "err") => void };

let nextId = 1;
export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (msg, tone) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 160);
    }, 3600);
  },
}));

/** Mostra um aviso curto no canto da janela. */
export const toast = (msg: string, tone?: "err") => useToasts.getState().push(msg, tone);
