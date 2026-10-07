import { appLanguage, t } from "../i18n";
import { ymd } from "./schedule";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const parse = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "Quarta-feira, 7 de outubro" / "Wednesday, October 7". */
export const longDate = (ymd: string) =>
  cap(parse(ymd).toLocaleDateString(appLanguage(), { weekday: "long", day: "numeric", month: "long" }));

/** "7 de outubro" / "October 7". */
export const dayMonth = (ymd: string) => parse(ymd).toLocaleDateString(appLanguage(), { day: "numeric", month: "long" });

/** "05:41" no fuso local. */
export const clock = (iso: string) => new Date(iso).toLocaleTimeString(appLanguage(), { hour: "2-digit", minute: "2-digit" });

export { nextEditionDate } from "./schedule";

/** "hoje", "amanhã" ou "sexta-feira, 9 de outubro": quando sai a próxima edição. */
export function whenLabel(day: string, now = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (day === ymd(now)) return t("when.today");
  if (day === ymd(tomorrow)) return t("when.tomorrow");
  return parse(day).toLocaleDateString(appLanguage(), { weekday: "long", day: "numeric", month: "long" });
}
