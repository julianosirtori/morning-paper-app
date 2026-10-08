import { describe, expect, it } from "vitest";
import { DAILY, lateAt, nextEditionDate, runsOn } from "../schedule";

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

describe("lateAt", () => {
  it("aviso às 06:00 com atraso 0 e fim 2 min depois", () => {
    const firedAt = new Date("2026-10-07T06:00:00").getTime();
    const now = new Date("2026-10-07T06:02:00").getTime();
    expect(lateAt(0, firedAt, now)).toBe(2);
  });

  it("disparo com atraso 0, geração termina 142 min depois", () => {
    const firedAt = new Date("2026-10-07T06:00:00").getTime();
    const now = new Date("2026-10-07T08:22:00").getTime();
    expect(lateAt(0, firedAt, now)).toBe(142);
  });

  it("atraso inicial 10 + 30 min", () => {
    const firedAt = new Date("2026-10-07T06:00:00").getTime();
    const now = new Date("2026-10-07T06:30:00").getTime();
    expect(lateAt(10, firedAt, now)).toBe(40);
  });

  it("relógio para trás (now < firedAt) usa só lateMinutes", () => {
    const firedAt = new Date("2026-10-07T06:30:00").getTime();
    const now = new Date("2026-10-07T06:00:00").getTime();
    expect(lateAt(15, firedAt, now)).toBe(15);
  });

  it("59 segundos arredonda para baixo (0 extra)", () => {
    const firedAt = new Date("2026-10-07T06:00:00").getTime();
    const now = new Date("2026-10-07T06:00:59").getTime();
    expect(lateAt(5, firedAt, now)).toBe(5);
  });
});
