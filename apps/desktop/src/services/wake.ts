import { t } from "../i18n";
import { setWake } from "../lib/native";
import { usePreferences } from "../store/preferences";
import { toast } from "../store/toasts";

/**
 * Liga/desliga o despertar diário do Mac (pmset, pede senha de administrador).
 * Se o usuário cancelar a senha, a opção volta ao estado anterior.
 */
export async function applyWake(enabled: boolean, time = usePreferences.getState().time): Promise<boolean> {
  try {
    await setWake(enabled, time);
    usePreferences.getState().setBackground({ wake: enabled });
    if (enabled) toast(t("prefs.toast.wake", { time }));
    return true;
  } catch (e) {
    console.warn(e);
    usePreferences.getState().setBackground({ wake: !enabled });
    toast(t("prefs.toast.wakeFailed"), "err");
    return false;
  }
}
