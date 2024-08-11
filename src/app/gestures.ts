import { fromEvent, map, merge, Observable, scan, timeInterval, timestamp } from 'rxjs';
import { Vector } from './math';

export interface TouchData {
  touchId: number;
  position: Vector;
  timestamp: number;
}

export type TouchEventData = {
  currentTouches: TouchData[];
  changedTouches: TouchData[]
};

export const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
export type TouchEventType = typeof touchEvents[number];

const TAP_OFFSET_TOLERANCE_PX = 10;

export function toTouchObservable<T extends TouchEventType>(target: HTMLElement, evtType: T): Observable<TouchEventData> {
  return fromHtmlElementEvent(target, evtType).pipe(
    map((evt) => {
      return {
        changedTouches: Array.from(evt.changedTouches).map((touch) => ({
          touchId: touch.identifier,
          position: getPosition(touch),
          timestamp: evt.timeStamp
        })),
        currentTouches: Array.from(evt.touches).map((touch) => ({
          touchId: touch.identifier,
          position: getPosition(touch),
          timestamp: evt.timeStamp
        }))
      }
    })
  );
}

type TouchState = Record<number, { position: Vector, timestamp: number }>

export function toTouchState(target: HTMLElement) {
  const reducers: { [p in TouchEventType]: (evt: TouchEventData, prev: TouchState) => TouchState } = {

    touchstart: (evt, prev) => {
      return {
        ...prev,
        ...Object.fromEntries(evt.currentTouches.map((evt) => ([evt.touchId, { position: evt.position, timestamp: evt.timestamp }])))
      }
    },
    touchmove: (evt, prev) => {
      return {
        ...prev,
        ...Object.fromEntries(evt.currentTouches.map((evt) => ([evt.touchId, { position: evt.position, timestamp: evt.timestamp }])))
      }
    },
    touchcancel: (evt, prev) => {
      const next = { ...prev };
      evt.changedTouches.forEach((touch) => delete next[touch.touchId]);
      return next;
    },
    touchend: (evt, prev) => {
      const next = { ...prev };
      evt.changedTouches.forEach((touch) => delete next[touch.touchId]);
      return next;
    },
  };

  const eventStreams = touchEvents.map((eventType) => toTouchObservable(target, eventType).pipe(
    map((data) => {
      return {
        eventType,
        data
      }
    })
  ));

  return merge(...eventStreams).pipe(
    scan((acc, curr) => {
      return reducers[curr.eventType](curr.data, acc);
    }, {} satisfies TouchState)
  )
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
