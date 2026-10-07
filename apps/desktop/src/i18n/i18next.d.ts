import "i18next";
import type ptBR from "./locales/pt-BR.json";

// Chaves de tradução tipadas: t("chave.inexistente") vira erro de compilação.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof ptBR };
  }
}
