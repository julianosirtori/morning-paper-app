import { useTranslation } from "react-i18next";
import { ViewHeader } from "../../components/ui/ViewHeader";
import { MorningEditionSection } from "./MorningEditionSection";
import { PrinterSection } from "./PrinterSection";
import { TopicsSection } from "./TopicsSection";
import { StyleSection } from "./StyleSection";
import { BackgroundSection } from "./BackgroundSection";
import { AssistantSection } from "./AssistantSection";
import { AdvancedSection } from "./AdvancedSection";

export function PreferencesView() {
  const { t } = useTranslation();
  return (
    <>
      <ViewHeader eyebrow={t("prefs.eyebrow")} title={t("prefs.title")} titleId="h-prefs" lead={t("prefs.lead")} />
      <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-md:grid-cols-1">
        <MorningEditionSection />
        <PrinterSection />
        <TopicsSection />
        <StyleSection />
        <BackgroundSection />
        <AssistantSection />
        <AdvancedSection />
      </div>
    </>
  );
}
