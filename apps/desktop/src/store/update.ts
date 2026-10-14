import { create } from "zustand";
import { checkUpdate, updateStatus, type UpdateStatus } from "../lib/native";

type UpdateState = {
  status: UpdateStatus | null;
  set: (status: UpdateStatus) => void;
  load: () => Promise<void>;
  /** Procura agora (ou instala a versão disponível, com `install`). */
  check: (install?: boolean) => Promise<void>;
};

/** Situação da atualização, espelhando o lado nativo (evento `update-status`). */
export const useUpdate = create<UpdateState>()((set) => ({
  status: null,
  set: (status) => set({ status }),
  load: async () => set({ status: await updateStatus() }),
  check: async (install = false) => {
    try {
      set({ status: await checkUpdate(install) });
    } catch (e) {
      set((s) => ({ status: s.status && { ...s.status, phase: "error", error: String(e) } }));
    }
  },
}));
