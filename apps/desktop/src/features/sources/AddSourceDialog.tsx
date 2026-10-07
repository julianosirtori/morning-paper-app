import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { PRIORITIES, SECTIONS } from "../../data/constants";
import type { Priority, SectionKey } from "../../data/types";
import { Button, IconButton } from "../../components/ui/Button";
import { Choice } from "../../components/ui/Choice";
import { Icon } from "../../components/ui/Icon";
import { Modal, ModalFooter, ModalHeader } from "../../components/ui/Modal";
import { checkFeed } from "../../services/feeds";
import { useSources } from "../../store/sources";
import { toast } from "../../store/toasts";
import { useUi } from "../../store/ui";

type UrlError = "urlEmpty" | "urlInvalid" | "notFeed";
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const withScheme = (v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);
const formatError = (v: string): UrlError | null => (!v.trim() ? "urlEmpty" : URL_RE.test(withScheme(v)) ? null : "urlInvalid");

/**
 * Cole o endereço do feed (ou do site): o app confere se há notícias e usa o título do feed como nome.
 * Validação ao sair do campo e resumo dos erros no topo ao enviar.
 */
function AddSourceForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const add = useSources((s) => s.add);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<UrlError | null>(null);
  const [detail, setDetail] = useState("");
  const [checking, setChecking] = useState(false);
  const [section, setSection] = useState<SectionKey>(SECTIONS[0]);
  const [priority, setPriority] = useState<Priority>("medium");
  const summaryRef = useRef<HTMLDivElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fmt = formatError(url);
    setError(fmt);
    if (fmt) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setChecking(true);
    const res = await checkFeed(withScheme(url));
    setChecking(false);
    if (!res.ok) {
      setError("notFeed");
      setDetail(res.error);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const finalName = name.trim() || res.title || new URL(res.url).hostname.replace(/^www\./, "");
    add({ name: finalName, url: res.url, site: res.site, section, priority, last: { at: new Date().toISOString(), ok: true, count: res.count } });
    onDone();
    toast(t("sources.toast.added", { name: finalName, count: res.count }));
  };

  return (
    <form className="grid gap-4 p-6" noValidate onSubmit={submit} aria-busy={checking || undefined}>
      <ModalHeader>
        <div><p className="eyebrow">{t("sources.add.eyebrow")}</p><h2 id="add-title">{t("sources.add.title")}</h2></div>
        <IconButton aria-label={t("sources.add.close")} onClick={onDone}><Icon name="close" /></IconButton>
      </ModalHeader>
      {error && (
        <div ref={summaryRef} tabIndex={-1} className="rounded-ctl border border-accent p-3 text-accent">
          <b>{t("sources.add.missing", { count: 1 })}</b>
          <ul className="mt-1 grid gap-0.5">
            <li>
              <a className="font-semibold underline" href="#f-url" onClick={(ev) => { ev.preventDefault(); document.getElementById("f-url")?.focus(); }}>
                {t(`sources.add.err.${error}`)}
              </a>
              {error === "notFeed" && detail && <span className="block text-12 opacity-80">{detail}</span>}
            </li>
          </ul>
        </div>
      )}
      <div className="grid gap-1">
        <label htmlFor="f-url" className="font-semibold">
          {t("sources.add.url")}<span className="text-accent" aria-hidden="true"> *</span><span className="sr-only">{t("sources.add.required")}</span>
        </label>
        <input
          type="url" id="f-url" inputMode="url" autoComplete="off" data-autofocus
          value={url}
          aria-invalid={error ? true : undefined}
          aria-describedby="f-url-hint"
          onChange={(e) => { setUrl(e.target.value); if (error) setError(formatError(e.target.value)); }}
          onBlur={() => { if (url) setError(formatError(url)); }}
        />
        <small id="f-url-hint" className="text-12 text-muted">{t("sources.add.urlHint")}</small>
      </div>
      <div className="grid gap-1">
        <label htmlFor="f-name" className="font-semibold">{t("sources.add.name")}</label>
        <input type="text" id="f-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="f-name-hint" />
        <small id="f-name-hint" className="text-12 text-muted">{t("sources.add.nameHint")}</small>
      </div>
      <div className="grid gap-1">
        <label htmlFor="f-section" className="font-semibold">{t("sources.add.section")}</label>
        <select id="f-section" value={section} onChange={(e) => setSection(e.target.value as SectionKey)}>
          {SECTIONS.map((s) => <option key={s} value={s}>{t(`sections.${s}`)}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1 font-semibold">{t("sources.add.priority")}</legend>
        <div className="flex gap-4">
          {PRIORITIES.map((p) => (
            <Choice key={p} type="radio" name="f-prio" checked={priority === p} onChange={() => setPriority(p)}>{t(`priority.${p}`)}</Choice>
          ))}
        </div>
      </fieldset>
      <ModalFooter>
        <Button onClick={onDone}>{t("sources.add.cancel")}</Button>
        <Button type="submit" variant="primary" disabled={checking}>{checking ? t("sources.add.checking") : t("sources.add.submit")}</Button>
      </ModalFooter>
    </form>
  );
}

export function AddSourceDialog() {
  const open = useUi((s) => s.addSourceOpen);
  const setOpen = useUi((s) => s.setAddSourceOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} aria-labelledby="add-title">
      <AddSourceForm onDone={() => setOpen(false)} />
    </Modal>
  );
}
