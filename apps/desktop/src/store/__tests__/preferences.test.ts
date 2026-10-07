import { describe, expect, it } from "vitest";
import { DEFAULT_TOPICS } from "../../data/constants";
import { rebalanceTopics } from "../preferences";

const total = (ts: { v: number }[]) => ts.reduce((s, t) => s + t.v, 0);

describe("rebalanceTopics", () => {
  it("mantém a soma em 100% ao mover um assunto", () => {
    for (const v of [0, 5, 35, 60, 100]) {
      const next = rebalanceTopics(DEFAULT_TOPICS, 0, v);
      expect(next[0].v).toBe(v);
      expect(total(next)).toBe(100);
    }
  });

  it("distribui por igual quando os outros estão zerados", () => {
    const next = rebalanceTopics(rebalanceTopics(DEFAULT_TOPICS, 2, 100), 2, 40);
    expect(total(next)).toBe(100);
    const each = 60 / (next.length - 1);
    expect(next.filter((_, i) => i !== 2).every((t) => Math.abs(t.v - each) <= 1)).toBe(true);
  });

  it("não altera a lista original", () => {
    const before = JSON.stringify(DEFAULT_TOPICS);
    rebalanceTopics(DEFAULT_TOPICS, 1, 50);
    expect(JSON.stringify(DEFAULT_TOPICS)).toBe(before);
  });
});
