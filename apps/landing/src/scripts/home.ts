// Só da página inicial: entrada ao rolar e o seletor de estilos da capa.
import { $, $$, reduceMotion } from "./dom";

/* Entrada ao rolar */
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -10% 0px" },
  );
  $$(".reveal").forEach((el) => io.observe(el));
} else {
  $$(".reveal").forEach((el) => el.classList.add("in"));
}

/* Seletor de estilos */
const stylePage = $("#style-page");
const styleCap = $("#style-cap");
$$<HTMLInputElement>('input[name="style"]').forEach((r) =>
  r.addEventListener("change", () => {
    stylePage.dataset.style = r.value;
    styleCap.textContent = `Estilo ${r.dataset.name}: ${r.dataset.description}. Notícias de exemplo.`;
  }),
);


