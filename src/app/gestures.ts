import { concatMap, exhaustMap, filter, finalize, first, fromEvent, map, merge, Observable, pairwise, scan, share, startWith, take, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { magSq, sub, Vector } from './math';
import { TouchEventType, TouchEventData, touchEvents, TouchState, TouchRecord } from './models';

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

const defaultState: TouchState = {
  lastUpdate: -1,
  lastEventType: 'touchend',
  touches: {},
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

const TAP_TOLERANCE_PX = 130;
const TAP_TIME_MS = 750;
export function tapScreen(touchState$: Observable<TouchState>, fingerCount: number) {
  touchState$ = touchState$.pipe(share());
  return touchState$.pipe(
    filter(x => x.lastEventType === 'touchstart' && touchCount(x.touches) <= fingerCount),
    exhaustMap((start) => {
      return touchState$.pipe(
        map(x => x.touches),
        startWith(start.touches),
        scan((acc, current) => {
          if (acc == null) {
            return null;
          }
          const newBase = collectTouches(acc.base, current);
          if (newBase == null) return null;
          return {
            base: newBase,
            current: current
          }
        }, {
          base: start.touches,
          current: start.touches
        } as {
          base: TouchRecord,
          current: TouchRecord
        } | null),
        takeWhile(x => {
          return x != null && sameFingersWithinTolerance(x.base, x.current, TAP_TOLERANCE_PX);
        }),
        filter(x => x != null && touchCount(x!.base) === fingerCount),
        take(1),
        exhaustMap((necessaryAmountOfTouchesReachedState) => {
          return touchState$.pipe(
            map(x => x.touches),
            startWith(necessaryAmountOfTouchesReachedState!.base!),
            pairwise(),
            takeWhile(([prev, current]) => touchReleasedOrStayedSame(prev, current) && sameFingersWithinTolerance(current, necessaryAmountOfTouchesReachedState!.base, TAP_TOLERANCE_PX)),
            filter(([prev, current]) => touchCount(current) === 0),
            take(1),
            map(() => necessaryAmountOfTouchesReachedState!.base)
          )
        }),
        takeUntil(timer(TAP_TIME_MS))
      )
    })
  )
}

function collectTouches(prev: TouchRecord, current: TouchRecord) {
  if (Object.keys(prev).some((touchId => !current[touchId]))) {
    return null;
  }
  return { ...current, ...prev };
}

function touchReleasedOrStayedSame(prev: TouchRecord, current: TouchRecord) {
  return touchCount(prev) >= touchCount(current);
}

function sameFingersWithinTolerance(prev: TouchRecord, current: TouchRecord, tolerance: number) {
  const toleranceSq = tolerance * tolerance;
  return Object.keys(prev).every((key) => {
    const curr = current[key];
    if (!curr) {
      return false;
    }
    return magSq(sub(prev[key].position, curr.position)) < toleranceSq;
  })
}

function getPosition(touch: Touch): Vector {
  return [touch.clientX, touch.clientY];
}

function touchCount(touches: TouchRecord) {
  return Object.keys(touches).length;
}

function log<T>(exec: () => T) {
  const result = exec();
  console.log('Result: ', result);
  return result;
}

function firstTouch(touches: TouchRecord) {
  return touches[Object.keys(touches)[0]];
}


export function fromHtmlElementEvent<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K): Observable<HTMLElementEventMap[K]> {
  return fromEvent(target, type) as any;
}
