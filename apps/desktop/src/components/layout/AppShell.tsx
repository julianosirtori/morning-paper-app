import { useEffect, useRef, type ReactNode } from "react";
import { useNavigation } from "../../store/navigation";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

/** Janela: sidebar + barra de ferramentas + área de conteúdo que rola por dentro. */
export function AppShell({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  const viewRef = useRef<HTMLElement>(null);
  const focusRequest = useNavigation((s) => s.focusRequest);

  // Ao trocar de tela: volta ao topo e, se pedido, rola até um bloco e foca o controle dele.
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.scrollTop = 0;
    if (!focusRequest.id) return;
    const target = document.getElementById(focusRequest.id);
    if (!target) return;
    v.scrollTop += target.getBoundingClientRect().top - v.getBoundingClientRect().top - 24;
    const control = target.matches("input,select,button") ? target : target.querySelector<HTMLElement>("input:checked,select,input,button");
    control?.focus({ preventScroll: true });
  }, [focusRequest]);

  return (
    <div className="grid h-screen grid-rows-[minmax(0,1fr)] overflow-hidden bg-paper">
      <div className="grid min-h-0 grid-cols-[224px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] max-md:grid-cols-[184px_minmax(0,1fr)]">
        <Sidebar />
        <main className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <Toolbar />
          <section
            ref={viewRef}
            aria-labelledby={labelledBy}
            className="min-h-0 overflow-auto overscroll-contain px-12 pt-8 pb-12 max-lg:px-8 max-lg:pt-6 max-lg:pb-8"
          >
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
