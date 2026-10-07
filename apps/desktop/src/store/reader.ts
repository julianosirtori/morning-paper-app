import { create } from "zustand";

export const MIN_ZOOM = 0.7;
export const MAX_ZOOM = 1.5;

type ReaderState = {
  /** Número da edição em leitura; null = a mais recente. */
  viewing: number | null;
  page: number;
  zoom: number;
  setPage: (i: number, total: number) => void;
  setZoom: (z: number) => void;
  open: (n: number | null) => void;
};

/** Estado da leitura na tela Edição: qual edição, página e zoom. */
export const useReader = create<ReaderState>()((set) => ({
  viewing: null,
  page: 0,
  zoom: 1,
  setPage: (i, total) => set({ page: Math.max(0, Math.min(total - 1, i)) }),
  setZoom: (z) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 10) / 10)) }),
  open: (viewing) => set({ viewing, page: 0 }),
}));
