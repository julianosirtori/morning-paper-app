// Recorrência da edição: todos os dias, a cada N dias ou em alguns dias da semana.
// A mesma regra roda no Rust (src-tauri/src/scheduler.rs › runs_on), que é quem dispara a edição.
import type { Repeat } from "../data/types";

export const DAILY: Repeat = { mode: "daily", every: 2, days: [1, 2, 3, 4, 5], from: "" };

const toDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Há edição neste dia ("YYYY-MM-DD")? */
export function runsOn(r: Repeat, day: string): boolean {
  switch (r.mode) {
    case "weekdays":
      return r.days.includes(toDate(day).getDay());
    case "interval": {
      if (!r.from || r.every < 2) return true;
      // Math.round: dias com horário de verão têm 23 ou 25 horas.
      const diff = Math.round((toDate(day).getTime() - toDate(r.from).getTime()) / 86_400_000);
      return ((diff % r.every) + r.every) % r.every === 0;
    }
    default:
      return true;
  }
}

/** Dia da próxima edição que ainda vai acontecer (hoje, se o horário não passou e hoje tem edição). */
export function nextEditionDate(time: string, repeat: Repeat = DAILY, now = new Date()): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() * 60 + now.getMinutes() >= h * 60 + m) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 400; i++) {
    if (runsOn(repeat, ymd(d))) return ymd(d);
    d.setDate(d.getDate() + 1);
  }
  return ymd(d);
}
