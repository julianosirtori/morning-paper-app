import { useTranslation } from "react-i18next";
import { EDITION_LANGS, type EditionLang } from "../../data/constants";
import { appLanguage } from "../../i18n";
import { usePreferences } from "../../store/preferences";
import { Note, PrefSection } from "./PrefSection";

export function AdvancedSection() {
  const { t } = useTranslation();
  const { editionLang, set } = usePreferences();
  return (
    <PrefSection titleId="h-p-adv" title={t("prefs.advanced.title")}>
      <div className="grid gap-1">
        <span className="font-semibold">{t("prefs.advanced.appLang")}</span>
        <Note>{t("prefs.advanced.appLangNote", { lang: t(`prefs.advanced.langs.${appLanguage()}`) })}</Note>
      </div>
      <div className="grid gap-1">
        <label htmlFor="pref-lang" className="font-semibold">{t("prefs.advanced.editionLang")}</label>
        <select id="pref-lang" value={editionLang} onChange={(e) => set({ editionLang: e.target.value as EditionLang })}>
          {EDITION_LANGS.map((l) => <option key={l} value={l}>{t(`prefs.advanced.langs.${l}`)}</option>)}
        </select>
      </div>
    </PrefSection>
  );
}
