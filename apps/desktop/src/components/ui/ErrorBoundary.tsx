import { Component, type ReactNode } from "react";
import { t } from "../../i18n";
import { Button } from "./Button";

type Props = { children: ReactNode; /** Muda ao trocar de tela: limpa o erro anterior. */ resetKey?: string };
type State = { error: Error | null };

/** Se uma tela quebrar, mostra um aviso no lugar dela em vez de deixar a janela em branco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="grid max-w-[560px] gap-3">
        <p className="eyebrow">{t("errorBoundary.eyebrow")}</p>
        <h2>{t("errorBoundary.title")}</h2>
        <p className="text-muted">{t("errorBoundary.text")}</p>
        <code className="block rounded-ctl bg-panel p-3 font-mono text-12 text-muted">{this.state.error.message}</code>
        <div><Button variant="primary" onClick={() => location.reload()}>{t("errorBoundary.reload")}</Button></div>
      </div>
    );
  }
}
