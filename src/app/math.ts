export type Vector = [number, number];

export function sub(v1: Vector, v2: Vector): Vector {
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

export function magSq(v: Vector): number {
  return v[0] * v[0] + v[1] * v[1];
}