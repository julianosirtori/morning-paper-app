import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Modal, ModalFooter, ModalHeader } from "../../components/ui/Modal";
import { useSources } from "../../store/sources";
import { toast } from "../../store/toasts";

type Props = { id: string | null; onClose: (removed: boolean) => void };

export function RemoveSourceDialog({ id, onClose }: Props) {
  const { t } = useTranslation();
  const source = useSources((s) => s.sources.find((x) => x.id === id));
  const remove = useSources((s) => s.remove);
  return (
    <Modal open={!!source} onClose={() => onClose(false)} aria-labelledby="confirm-title">
      {source && (
        <div className="grid gap-4 p-6">
          <ModalHeader><h2 id="confirm-title">{t("sources.remove.title", { name: source.name })}</h2></ModalHeader>
          <p>{t("sources.remove.text", { name: source.name })}</p>
          <ModalFooter>
            <Button onClick={() => onClose(false)}>{t("sources.remove.cancel")}</Button>
            <Button variant="danger" onClick={() => { remove(source.id); toast(t("sources.toast.removed", { name: source.name })); onClose(true); }}>{t("sources.remove.confirm")}</Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
