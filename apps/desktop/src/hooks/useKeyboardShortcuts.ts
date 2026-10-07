import { useEffect } from "react";
import { useNavigation } from "../store/navigation";
import { useUi } from "../store/ui";

/** ⌘K abre os comandos · ⌘P vai para Imprimir · ⌘, abre Preferências. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const { go } = useNavigation.getState();
      switch (e.key.toLowerCase()) {
        case "k": e.preventDefault(); useUi.getState().togglePalette(); break;
        case "p": e.preventDefault(); go("imprimir"); break;
        case ",": e.preventDefault(); go("preferencias"); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
