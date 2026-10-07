import { useTranslation } from "react-i18next";
import { PRIORITIES } from "../../data/constants";
import { Icon } from "../../components/ui/Icon";
import { Menu, MenuGroup, MenuItem, MenuItemRadio, MenuLabel } from "../../components/ui/Menu";
import { openExternal } from "../../lib/native";
import { useSources } from "../../store/sources";
import { toast } from "../../store/toasts";
import { siteOf } from "../../data/sources";

type Props = { id: string; anchor: HTMLElement; onClose: (refocus: boolean) => void; onRemove: () => void };

/** Menu "···" de cada fonte: prioridade, pausar/retomar, abrir site e remover. */
export function SourceActionsMenu({ id, anchor, onClose, onRemove }: Props) {
  const { t } = useTranslation();
  const source = useSources((s) => s.sources.find((x) => x.id === id));
  const update = useSources((s) => s.update);
  if (!source) return null;
  const site = source.site ?? siteOf(source.url);
  const paused = source.paused;
  return (
    <Menu anchor={anchor} onClose={onClose} label={t("sources.optionsFor", { name: source.name })}>
      <MenuLabel>{t("sources.menu.priority")}</MenuLabel>
      {PRIORITIES.map((p) => (
        <MenuItemRadio key={p} checked={source.priority === p} onClick={() => { update(id, { priority: p }); onClose(true); toast(t("sources.toast.priority", { name: source.name, priority: t(`priority.${p}`).toLowerCase() })); }}>
          {t(`priority.${p}`)}
        </MenuItemRadio>
      ))}
      <MenuGroup>
        <MenuItem onClick={() => {
          update(id, { paused: !paused });
          onClose(true);
          toast(t(paused ? "sources.toast.resumed" : "sources.toast.paused", { name: source.name }));
        }}>
          {paused ? t("sources.menu.resume") : t("sources.menu.pause")}
        </MenuItem>
        {site && <MenuItem onClick={() => { openExternal(site); onClose(true); }}>{t("sources.menu.openSite")} <Icon name="ext" /></MenuItem>}
      </MenuGroup>
      <MenuGroup>
        <MenuItem danger onClick={() => { onClose(false); onRemove(); }}>{t("sources.menu.remove")}</MenuItem>
      </MenuGroup>
    </Menu>
  );
}
