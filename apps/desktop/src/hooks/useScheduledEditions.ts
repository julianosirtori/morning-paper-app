import { useEffect } from "react";
import { onScheduledEdition } from "../lib/native";
import { deliver } from "../services/delivery";
import { useEditions } from "../store/editions";

/** No horário agendado (aviso do Rust): gera a edição e faz a entrega (PDF, impressora, notificação). */
export function useScheduledEditions() {
  useEffect(() => {
    const unlisten = onScheduledEdition(async (lateMinutes) => {
      const doc = await useEditions.getState().generate("scheduled");
      if (doc) await deliver(doc, lateMinutes);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);
}
