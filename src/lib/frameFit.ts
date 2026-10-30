/**
 * Measures how large the Glimer can be inside a frame without its edge
 * peeking out between the frame's spikes, leaves or ornaments.
 *
 * The frame's transparent area connected to the outer border ("outside") is
 * flood-filled; the closest outside pixel to the centre is the largest safe
 * Glimer radius. Works for any uploaded frame, so admin frames are covered too.
 */

export const DEFAULT_GLIMER_SCALE = 90; // % of the avatar box
const MIN_SCALE = 55; // below this the ring is "open" (thin/wispy) → keep default
const SAMPLE = 128;

/** Pure measurement on an alpha channel (row-major, size×size). Returns % diameter. */
export function computeGlimerScale(alpha: Uint8ClampedArray | number[], size: number): number {
  const n = size * size;
  let solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = alpha[i] > 100 ? 1 : 0;

  // Morphological closing (dilate then erode, 2 passes) to seal hairline gaps.
  const pass = (src: Uint8Array, dilate: boolean) => {
    const dst = new Uint8Array(n);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = dilate ? 0 : 1;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            const s = xx < 0 || yy < 0 || xx >= size || yy >= size ? 0 : src[yy * size + xx];
            if (dilate && s) v = 1;
            if (!dilate && !s) v = 0;
          }
        }
        dst[y * size + x] = v;
      }
    }
    return dst;
  };
  solid = pass(pass(solid, true), true);
  solid = pass(pass(solid, false), false);

  // Flood fill the outside from every border pixel.
  const outside = new Uint8Array(n);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!solid[i] && !outside[i]) { outside[i] = 1; stack.push(i); }
  };
  for (let i = 0; i < size; i++) {
    push(i); push((size - 1) * size + i); push(i * size); push(i * size + size - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % size, y = (i - x) / size;
    if (x > 0) push(i - 1);
    if (x < size - 1) push(i + 1);
    if (y > 0) push(i - size);
    if (y < size - 1) push(i + size);
  }

  const c = (size - 1) / 2;
  let minD = Infinity;
  for (let i = 0; i < n; i++) {
    if (!outside[i]) continue;
    const x = i % size, y = (i - x) / size;
    const d = Math.hypot(x - c, y - c);
    if (d < minD) minD = d;
  }
  if (!isFinite(minD)) return DEFAULT_GLIMER_SCALE;
  const pct = ((minD - 1) * 2 * 100) / size;
  if (pct < MIN_SCALE) return DEFAULT_GLIMER_SCALE;
  return Math.min(DEFAULT_GLIMER_SCALE, Math.floor(pct));
}

const cache = new Map<string, Promise<number>>();

export function measureFrameFit(src: string): Promise<number> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = new Promise<number>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(DEFAULT_GLIMER_SCALE);
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        const rgba = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
        const alpha = new Uint8ClampedArray(SAMPLE * SAMPLE);
        for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
        resolve(computeGlimerScale(alpha, SAMPLE));
      } catch {
        resolve(DEFAULT_GLIMER_SCALE); // tainted canvas (no CORS) → safe default
      }
    };
    img.onerror = () => resolve(DEFAULT_GLIMER_SCALE);
    img.src = src;
  });
  cache.set(src, p);
  return p;
}
