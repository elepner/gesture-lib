import { fromEvent, map, Observable } from 'rxjs';
import { Vector } from './math';

export interface TouchData {
  touchId: number;
  position: Vector;
}

export type TouchEventData = {
  currentTouches: TouchData[];
  changedTouches: TouchData[]
};

export const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
export type TouchEventType = typeof touchEvents[number];

export function toTouchObservable<T extends TouchEventType>(target: HTMLElement, evtType: T): Observable<TouchEventData> {
  return fromHtmlElementEvent(target, evtType).pipe(
    map((evt) => {
      return {
        changedTouches: Array.from(evt.changedTouches).map((touch) => ({
          touchId: touch.identifier,
          position: getPosition(touch)
        })),
        currentTouches: Array.from(evt.touches).map((touch) => ({
          touchId: touch.identifier,
          position: getPosition(touch)
        }))
      }
    })
  );
}

export function tap(target: HTMLElement) {
  toTouchObservable(target, 'touchstart').pipe(

  )
}

function getPosition(touch: Touch): Vector {
  return [touch.clientX, touch.clientY];
}

export function fromHtmlElementEvent<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K): Observable<HTMLElementEventMap[K]> {
  return fromEvent(target, type) as any;
}
