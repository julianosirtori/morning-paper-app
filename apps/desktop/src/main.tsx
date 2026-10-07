import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initI18n } from "./i18n";
import "./styles.css";

// As traduções (e o idioma do sistema) precisam estar prontas antes de carregar as telas,
// porque as stores criam o conteúdo inicial no idioma do app.
initI18n().then(async () => {
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
