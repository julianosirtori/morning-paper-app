import { useTranslation } from "react-i18next";
import { ViewHeader } from "../../components/ui/ViewHeader";
import { useLatestEdition } from "../../store/editions";
import { EmptyToday } from "../today/EmptyToday";
import { ReviewItem } from "./ReviewItem";

/** Revisão da edição mais recente: tirar/colocar notícias, editar resumos, trocar manchete e seção. */
export function ReviewView() {
  const { t } = useTranslation();
  const doc = useLatestEdition();
  const included = doc?.stories.filter((s) => s.inc).length ?? 0;
  return (
    <>
      <ViewHeader
        eyebrow={doc ? t("review.eyebrow", { included, total: doc.stories.length }) : t("nav.review")}
        title={t("review.title")}
        titleId="h-revisar"
        lead={t("review.lead")}
      />
      {doc ? <div>{doc.stories.map((s) => <ReviewItem key={s.id} n={doc.n} story={s} />)}</div> : <EmptyToday />}
    </>
  );
}
