import { t } from "../../i18n";
import { pickFile } from "../../lib/pickFile";
import { parseOpml } from "../../lib/opml";
import { useNavigation } from "../../store/navigation";
import { useSources } from "../../store/sources";
import { toast } from "../../store/toasts";

/** Importa fontes de um arquivo OPML escolhido pelo usuário. Devolve quantas entraram. */
export async function importOpml(): Promise<number> {
  const file = await pickFile(".opml,.xml,text/xml");
  if (!file) return 0;
  const feeds = parseOpml(await file.text());
  const added = useSources.getState().addMany(feeds.map((f) => ({ name: f.name, url: f.url, section: "world", priority: "medium" })));
  if (useNavigation.getState().view !== "fontes" && useNavigation.getState().view !== "hoje") useNavigation.getState().go("fontes");
  if (added) toast(t("sources.toast.imported", { count: added, file: file.name }));
  else toast(t("sources.toast.noneImported", { file: file.name }), "err");
  return added;
}
