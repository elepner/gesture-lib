import { fromEvent, map, Observable, tap } from 'rxjs';
import { Vector } from './math';


export interface TouchData {
  touchId: number;
  position: Vector;
}

export type TouchEventData = TouchData[];

export const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
export type TouchEventType = typeof touchEvents[number]
export function toTouchObservable<T extends TouchEventType>(target: HTMLElement, evtType: T): Observable<TouchData[]> {
  return fromHtmlElementEvent(target, evtType).pipe(
    tap((evt) => {
      if (evtType === 'touchend') {
        console.log('Native event', evt)
      }
    }),
    map((evt) => {
      return Array.from(evt.touches).map((touch) => ({
        touchId: touch.identifier,
        position: getPosition(touch)
      }))
    }));
}



function getPosition(touch: Touch): Vector {
  return [touch.clientX, touch.clientY];
}

function fromHtmlElementEvent<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K): Observable<HTMLElementEventMap[K]> {
  return fromEvent(target, type) as any;
}
