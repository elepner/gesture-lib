export function isNotNull<T>(el: T | null | undefined): el is T {
  return el != null;
}

export function arrMap<T, U>(arr: [T, T, T, T], callbackfn: (value: T, index: number, array: T[]) => U): [U, U, U, U];
export function arrMap<T, U>(arr: [T, T, T], callbackfn: (value: T, index: number, array: T[]) => U): [U, U, U];
export function arrMap<T, U>(arr: [T, T], callbackfn: (value: T, index: number, array: T[]) => U): [U, U];
export function arrMap<T, U>(arr: T[], callbackfn: (value: T, index: number, array: T[]) => U) {
  return arr.map(callbackfn);
}
