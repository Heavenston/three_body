export { VecN } from "./math/vec";
export { Color } from "./math/color";

export function clamp(val: number, min: number | null, max: number | null): number {
  if (min !== null && val < min)
    return min;
  if (max !== null && val > max)
    return max;
  return val;
}

export function lerp(from: number, to: number, t: number): number {
  return (from * (1-t)) + (to * t);
}

export function expDecay(from: number, to: number, dt: number, halfLife: number): number {
  return to + (from - to) * (2 ** (-dt / halfLife));
}

export function modExpDecay(
  from: number, to: number,
  modulo: number,
  dt: number, halfLife: number,
): number {
  to = ((to % modulo) + modulo) % modulo;
  from = ((from % modulo) + modulo) % modulo;

  if (Math.abs(to - from) > Math.PI) {
    if (to < from)
      to += modulo;
    else
      to -= modulo;
  }

  return expDecay(from, to, dt, halfLife);
}

// From stack overflow :)
export function gaussianRandom(mean=0, stdev=1): number {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

export function isZeroApprox(n: number): boolean {
  return Math.abs(n) <= 1e-10;
}
