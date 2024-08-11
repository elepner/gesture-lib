export type Vector = [number, number];

export function sub(v1: Vector, v2: Vector): Vector {
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

export function add(v1: Vector, v2: Vector): Vector {
  return [v1[0] + v2[0], v1[1] + v2[1]];
}

export function magSq(v: Vector): number {
  return v[0] * v[0] + v[1] * v[1];
}

export function scale(v: Vector, factor: number): Vector {
  return [v[0] * factor, v[1] * factor];
}

export function center(points: Vector[]): Vector {
  if (points.length === 0) {
    throw new Error('Sequence is empty');
  }

  return scale(points.reduce((acc, current) => {
    return add(acc, current);
  }, [0, 0]), 1 / points.length)
}