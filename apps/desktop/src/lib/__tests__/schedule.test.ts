import { describe, expect, it } from "vitest";
import { DAILY, nextEditionDate, runsOn } from "../schedule";

// 2026-10-07 é uma quarta-feira.
const at = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00`);

describe("recorrência", () => {
  it("todos os dias: hoje antes do horário, amanhã depois", () => {
    expect(nextEditionDate("06:00", DAILY, at("05:00"))).toBe("2026-10-07");
    expect(nextEditionDate("06:00", DAILY, at("10:00"))).toBe("2026-10-08");
  });
  it("a cada N dias, contando do primeiro dia", () => {
    const every2 = { ...DAILY, mode: "interval" as const, every: 2, from: "2026-10-08" };
    expect(runsOn(every2, "2026-10-08")).toBe(true);
    expect(runsOn(every2, "2026-10-09")).toBe(false);
    expect(runsOn(every2, "2026-10-10")).toBe(true);
    expect(nextEditionDate("06:00", { ...every2, every: 3 }, at("10:00"))).toBe("2026-10-08");
    expect(nextEditionDate("06:00", { ...every2, every: 3, from: "2026-10-06" }, at("10:00"))).toBe("2026-10-09");
  });
  it("só em alguns dias da semana", () => {
    const mondays = { ...DAILY, mode: "weekdays" as const, days: [1] };
    expect(nextEditionDate("06:00", mondays, at("10:00"))).toBe("2026-10-12");
    expect(runsOn(mondays, "2026-10-07")).toBe(false);
  });
});
