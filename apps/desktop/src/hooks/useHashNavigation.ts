import { useEffect } from "react";
import { syncViewFromHash } from "../store/navigation";

/** Mantém a tela em sincronia com o voltar/avançar do histórico (#hoje, #edicao…). */
export function useHashNavigation() {
  useEffect(() => {
    addEventListener("popstate", syncViewFromHash);
    return () => removeEventListener("popstate", syncViewFromHash);
  }, []);
}
