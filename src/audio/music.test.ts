import { describe, expect, it } from "vitest";
import { BASS, FORM, LEAD } from "./music";

describe("background music", () => {
  it("has a bass line and a tune for every bar of the form", () => {
    expect(BASS).toHaveLength(FORM.length);
    expect(LEAD).toHaveLength(FORM.length);
  });

  it("fits every bass and melody note inside its bar", () => {
    for (const bar of [...BASS, ...LEAD]) for (const [step, , len] of bar) expect(step + len).toBeLessThanOrEqual(16);
  });

  it("leads the bass into every chord change by landing on the new root or a half step from it", () => {
    FORM.forEach((chord, i) => {
      const next = FORM[(i + 1) % FORM.length];
      if (next === chord) return;
      const last = BASS[i][BASS[i].length - 1][1];
      expect(Math.abs(last - next.root)).toBeLessThanOrEqual(1);
    });
  });
});
