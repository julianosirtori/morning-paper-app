import { useEffect } from "react";
import { logEvent, onScheduledEdition } from "../lib/native";
import { lateAt } from "../lib/schedule";
import { deliver } from "../services/delivery";
import { useEditions } from "../store/editions";

/** No horário agendado (aviso do Rust): gera a edição e faz a entrega (PDF, impressora, notificação). */
export function useScheduledEditions() {
  useEffect(() => {
    const unlisten = onScheduledEdition(async (lateMinutes) => {
      const firedAt = Date.now();
      logEvent(`aviso do agendador recebido (atraso ${lateMinutes} min)`);
      try {
        const doc = await useEditions.getState().generate("scheduled");
        if (!doc) {
          logEvent("geração agendada não produziu edição");
          return;
        }
        logEvent(`edição ${doc.n} gerada`);
        await deliver(doc, lateAt(lateMinutes, firedAt));
      } catch (e) {
        logEvent(`geração agendada falhou: ${String(e)}`);
        throw e;
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, []);
}
