import type { ComponentType } from "react";
import { AppShell } from "./components/layout/AppShell";
import { IconSprite } from "./components/ui/Icon";
import { Toasts } from "./components/ui/Toasts";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { TodayView } from "./features/today/TodayView";
import { EditionView } from "./features/edition/EditionView";
import { ReviewView } from "./features/review/ReviewView";
import { PrintView } from "./features/print/PrintView";
import { PrintSheets } from "./features/print/PrintSheets";
import { SourcesView } from "./features/sources/SourcesView";
import { AddSourceDialog } from "./features/sources/AddSourceDialog";
import { PreferencesView } from "./features/preferences/PreferencesView";
import { CommandPalette } from "./features/command-palette/CommandPalette";
import { useHashNavigation } from "./hooks/useHashNavigation";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNativeSync } from "./hooks/useNativeSync";
import { useTrayActions } from "./hooks/useTrayActions";
import { useScheduledEditions } from "./hooks/useScheduledEditions";
import { useNavigation, type ViewId } from "./store/navigation";
import { usePreferences } from "./store/preferences";
import { OnboardingView } from "./features/onboarding/OnboardingView";

/** Cada tela e o id do seu título (para aria-labelledby da área de conteúdo). */
const VIEWS: Record<ViewId, { Component: ComponentType; titleId: string }> = {
  hoje: { Component: TodayView, titleId: "h-hoje" },
  edicao: { Component: EditionView, titleId: "h-edicao" },
  revisar: { Component: ReviewView, titleId: "h-revisar" },
  imprimir: { Component: PrintView, titleId: "h-imprimir" },
  fontes: { Component: SourcesView, titleId: "h-fontes" },
  preferencias: { Component: PreferencesView, titleId: "h-prefs" },
};

export default function App() {
  useHashNavigation();
  useKeyboardShortcuts();
  useTrayActions();
  useNativeSync();
  useScheduledEditions();

  const view = useNavigation((s) => s.view);
  const onboarded = usePreferences((s) => s.onboarded);
  const { Component, titleId } = VIEWS[view];

  if (!onboarded) {
    return (
      <>
        <IconSprite />
        <ErrorBoundary>
          <OnboardingView />
        </ErrorBoundary>
        <Toasts />
      </>
    );
  }

  return (
    <>
      <IconSprite />
      <AppShell labelledBy={titleId}>
        <ErrorBoundary resetKey={view}>
          <Component />
        </ErrorBoundary>
      </AppShell>
      <AddSourceDialog />
      <CommandPalette />
      <Toasts />
      <PrintSheets />
    </>
  );
}
