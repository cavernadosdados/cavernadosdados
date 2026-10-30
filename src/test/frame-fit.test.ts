import { describe, it, expect } from "vitest";
import { computeGlimerScale, DEFAULT_GLIMER_SCALE } from "@/lib/frameFit";

const SIZE = 128;
const c = (SIZE - 1) / 2;

function draw(fn: (r: number, angle: number) => boolean) {
  const a = new Uint8ClampedArray(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const r = Math.hypot(x - c, y - c);
      a[y * SIZE + x] = fn(r, Math.atan2(y - c, x - c)) ? 255 : 0;
    }
  return a;
}

describe("computeGlimerScale", () => {
  it("keeps the Glimer at 90% for a solid ring that reaches the edge", () => {
    const ring = draw((r) => r >= 52 && r <= 63);
    expect(computeGlimerScale(ring, SIZE)).toBe(DEFAULT_GLIMER_SCALE);
  });

  it("shrinks the Glimer so it does not show between spikes", () => {
    // ring body 38–46px radius, spikes reaching 63px, valleys reach down to the body
    const spiky = draw((r, ang) => (r >= 38 && r <= 46) || (r > 46 && r <= 63 && Math.cos(ang * 12) > 0.3));
    const scale = computeGlimerScale(spiky, SIZE);
    expect(scale).toBeLessThan(80);
    expect(scale).toBeGreaterThanOrEqual(70);
  });

  it("falls back to 90% for an open, wispy ring", () => {
    const open = draw((r, ang) => r >= 55 && r <= 57 && Math.sin(ang * 6) > 0);
    expect(computeGlimerScale(open, SIZE)).toBe(DEFAULT_GLIMER_SCALE);
  });
});
