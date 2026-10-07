import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { cityOf, localNewsUrl } from "../../data/sources";
import { checkFeed } from "../../services/feeds";
import { editionLang } from "../../store/editions";
import type { NewSource } from "../../store/sources";

type Props = {
  /** Endereços que já são fontes, para não repetir a cidade. */
  existing: string[];
  onAdd: (source: NewSource, count: number) => void;
  idPrefix: string;
};

/** Digite a cidade: o app monta um feed com as notícias locais (Google Notícias) e confere se há resultados. */
export function LocalNewsForm({ existing, onAdd, idPrefix }: Props) {
  const { t } = useTranslation();
  const [city, setCity] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cities = [...new Set(existing.map(cityOf).filter(Boolean) as string[])];
  const id = `${idPrefix}-city`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = city.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (cities.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError(t("sources.local.exists", { city: name }));
      return;
    }
    setChecking(true);
    setError(null);
    const res = await checkFeed(localNewsUrl(name, editionLang()));
    setChecking(false);
    if (!res.ok || !res.count) {
      setError(t("sources.local.notFound"));
      return;
    }
    onAdd({ name: t("sources.local.name", { city: name }), url: res.url, section: "local", priority: "medium" }, res.count);
    setCity("");
  };

  return (
    <div className="grid max-w-[640px] gap-3">
      <p className="text-muted">{t("sources.local.text")}</p>
      <form className="flex items-start gap-2" onSubmit={submit} noValidate>
        <div className="grid flex-1 gap-1">
          <label htmlFor={id} className="sr-only">{t("sources.local.city")}</label>
          <input
            id={id} type="text" autoComplete="address-level2" value={city}
            placeholder={t("sources.local.placeholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint`}
            onChange={(e) => { setCity(e.target.value); setError(null); }}
          />
          <small id={`${id}-hint`} className={clsx("text-12", error ? "text-accent" : "text-muted")} role={error ? "alert" : undefined}>
            {error ?? t("sources.local.hint")}
          </small>
        </div>
        <Button type="submit" disabled={checking || !city.trim()}>{checking ? t("sources.add.checking") : t("sources.local.add")}</Button>
      </form>
      {cities.length > 0 && (
        <p className="note">{t("sources.local.current", { count: cities.length, list: cities.join(", ") })}</p>
      )}
    </div>
  );
}
