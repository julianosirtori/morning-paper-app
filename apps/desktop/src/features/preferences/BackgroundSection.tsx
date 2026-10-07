import { useTranslation } from "react-i18next";
import { SwitchRow } from "../../components/ui/Switch";
import type { Background } from "../../lib/native";
import { applyWake } from "../../services/wake";
import { usePreferences } from "../../store/preferences";
import { Note, PrefSection } from "./PrefSection";

const ROWS: (keyof Background)[] = ["login", "keep", "wake", "menubar", "dock"];

/** Comportamento do app em segundo plano — aplicado no lado nativo por useNativeSync. */
export function BackgroundSection() {
  const { t } = useTranslation();
  const { background, setBackground } = usePreferences();
  return (
    <PrefSection id="background-pref" titleId="h-p-bg" title={t("prefs.background.title")} note={<Note>{t("prefs.background.note")}</Note>}>
      {ROWS.map((key) => {
        const disabled = key === "dock" && !background.menubar;
        return (
          <SwitchRow
            key={key}
            label={t(`prefs.background.${key}`)}
            description={disabled ? t("prefs.background.dockDisabled") : t(`prefs.background.${key}Note`)}
            checked={background[key]}
            disabled={disabled}
            onChange={(v) => (key === "wake" ? applyWake(v) : setBackground({ [key]: v }))}
          />
        );
      })}
    </PrefSection>
  );
}
