import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { SUGGESTED_SOURCES } from "../../data/sources";
import { Button } from "../../components/ui/Button";
import { Status } from "../../components/ui/Status";
import { appLanguage } from "../../i18n";
import { parseOpml } from "../../lib/opml";
import { pickFile } from "../../lib/pickFile";
import { checkFeed } from "../../services/feeds";
import type { NewSource } from "../../store/sources";
import { LocalNewsForm } from "../sources/LocalNewsForm";

type Props = { chosen: NewSource[]; onChange: (list: NewSource[]) => void };

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^(www|feeds?|rss)\./, "");
  } catch {
    return url;
  }
};

/** Escolha das fontes: sugestões no idioma do Mac, um endereço próprio (conferido na hora) ou um OPML. */
export function SourcesStep({ chosen, onChange }: Props) {
  const { t } = useTranslation();
  const suggested = SUGGESTED_SOURCES[appLanguage()];
  const [extra, setExtra] = useState<NewSource[]>([]);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Começa com as recomendadas marcadas
  useEffect(() => {
    if (!chosen.length) onChange(suggested.filter((s) => s.recommended).map(({ recommended: _, ...s }) => s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOn = (u: string) => chosen.some((c) => c.url === u);
  const toggle = (s: NewSource) => onChange(isOn(s.url) ? chosen.filter((c) => c.url !== s.url) : [...chosen, s]);

  const addUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setChecking(true);
    setError(null);
    const full = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const res = await checkFeed(full);
    setChecking(false);
    if (!res.ok) {
      setError(t("onboarding.sources.notFeed"));
      return;
    }
    const s: NewSource = { name: res.title || host(res.url), url: res.url, site: res.site, section: "world", priority: "medium" };
    setExtra((x) => [...x, s]);
    onChange([...chosen, s]);
    setUrl("");
  };

  const importFile = async () => {
    const file = await pickFile(".opml,.xml,text/xml");
    if (!file) return;
    const feeds = parseOpml(await file.text()).map<NewSource>((f) => ({ name: f.name, url: f.url, section: "world", priority: "medium" }));
    const fresh = feeds.filter((f) => !isOn(f.url));
    setExtra((x) => [...x, ...fresh]);
    onChange([...chosen, ...fresh]);
  };

  const all = [...suggested.map(({ recommended: _, ...s }) => s), ...extra];
  return (
    <div className="grid gap-8">
      <section aria-labelledby="ob-suggested">
        <h2 id="ob-suggested" className="section-title">{t("onboarding.sources.suggested")}</h2>
        <div className="grid grid-cols-3 gap-2 max-lg:grid-cols-2" role="group" aria-labelledby="ob-suggested">
          {all.map((s) => (
            <label key={s.url} className={clsx("opt-card", isOn(s.url) && "is-on")}>
              <input type="checkbox" checked={isOn(s.url)} onChange={() => toggle(s)} />
              <b className="font-semibold">{s.name}</b>
              <small className="text-12 text-muted">{t(`sections.${s.section}`)} · {host(s.url)}</small>
              {isOn(s.url) && <span className="mt-1"><Status tone="ok" icon="check">{t("onboarding.sources.selected")}</Status></span>}
            </label>
          ))}
        </div>
        <p className="note mt-3" role="status">{t("onboarding.sources.count", { count: chosen.length })}</p>
      </section>

      <section aria-labelledby="ob-local">
        <h2 id="ob-local" className="section-title">{t("sources.local.title")}</h2>
        <LocalNewsForm
          idPrefix="ob"
          existing={chosen.map((c) => c.url)}
          onAdd={(s) => {
            setExtra((x) => [...x, s]);
            onChange([...chosen, s]);
          }}
        />
      </section>

      <section aria-labelledby="ob-own" className="grid max-w-[640px] gap-3">
        <h2 id="ob-own" className="section-title">{t("onboarding.sources.own")}</h2>
        <form className="flex items-start gap-2" onSubmit={addUrl} noValidate>
          <div className="grid flex-1 gap-1">
            <label htmlFor="ob-url" className="sr-only">{t("sources.add.url")}</label>
            <input
              id="ob-url" type="url" inputMode="url" autoComplete="off" value={url}
              placeholder={t("onboarding.sources.urlPlaceholder")}
              aria-invalid={error ? true : undefined}
              aria-describedby="ob-url-hint"
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
            />
            <small id="ob-url-hint" className={clsx("text-12", error ? "text-accent" : "text-muted")}>{error ?? t("onboarding.sources.urlHint")}</small>
          </div>
          <Button type="submit" disabled={checking || !url.trim()}>{checking ? t("sources.add.checking") : t("onboarding.sources.add")}</Button>
        </form>
        <div><Button variant="text" onClick={importFile}>{t("onboarding.sources.importOpml")}</Button></div>
      </section>
    </div>
  );
}
