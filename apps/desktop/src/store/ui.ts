import { create } from "zustand";

type UiState = {
  addSourceOpen: boolean;
  paletteOpen: boolean;
  /** Título temporário do menu da barra de menus (ex.: "Gerando nova edição…"). */
  trayTitle: string | null;
  setAddSourceOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setTrayTitle: (title: string | null) => void;
};

export const useUi = create<UiState>()((set) => ({
  addSourceOpen: false,
  paletteOpen: false,
  trayTitle: null,
  setAddSourceOpen: (addSourceOpen) => set({ addSourceOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setTrayTitle: (trayTitle) => set({ trayTitle }),
}));
