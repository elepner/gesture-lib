import { filter, fromEvent, map, merge, Observable, scan, timeInterval, timestamp } from 'rxjs';
import { Vector } from './math';

export interface TouchData {
  touchId: number;
  position: Vector;
  timestamp: number;
}

export type TouchEventData = {
  currentTouches: TouchData[];
  changedTouches: TouchData[];
  timestamp: number;
};

export const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
export type TouchEventType = typeof touchEvents[number];


export function toTouchObservable<T extends TouchEventType>(target: HTMLElement, evtType: T): Observable<TouchEventData> {
  return fromHtmlElementEvent(target, evtType).pipe(
    map((evt) => {
      return {
        timestamp: evt.timeStamp,
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

type TouchRecord = Record<number, { position: Vector, timestamp: number }>
interface TouchState {
  lastUpdate: number;
  touches: TouchRecord;
  lastEventType: TouchEventType;
}


export function toTouchState(target: HTMLElement) {
  const reducers: { [p in TouchEventType]: (evt: TouchEventData, prev: TouchRecord) => TouchRecord } = {

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
      return {
        lastUpdate: curr.data.timestamp,
        touches: reducers[curr.eventType](curr.data, acc.touches),
        lastEventType: curr.eventType
      }
    }, {
      lastUpdate: -1,
      touches: {}
    } as TouchState)
  )
}

const TAP_TOLERANCE_PX = 10;
const TAP_TIME_MS = 500;
export function tap(touchState$: Observable<TouchState>, fingerCount: number) {
  touchState$.pipe(

  )
}

function getPosition(touch: Touch): Vector {
  return [touch.clientX, touch.clientY];
}

export function fromHtmlElementEvent<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K): Observable<HTMLElementEventMap[K]> {
  return fromEvent(target, type) as any;
}
