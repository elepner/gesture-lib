import { bufferTime, delay, exhaustMap, filter, fromEvent, interval, map, merge, Observable, of, pairwise, race, raceWith, scan, skipWhile, startWith, switchMap, take, takeLast, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { center, magSq, sub, Vector } from './math';
import { TouchEventType, TouchEventData, touchEvents, TouchState, TouchRecord } from './models';
import { arrMap, isNotNull } from './utils';

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

const TAP_TOLERANCE_PX = 15;
const TAP_TIME_MS = 750;

function tapInternal(touchState$: Observable<TouchState>, fingerCount: number) {
  return waitForPress(touchState$.pipe(map(x => x.touches)), fingerCount).pipe(
    exhaustMap((screenPressed$) => {
      return screenPressed$.pipe(
        exhaustMap(necessaryAmountOfTouchesReachedState => {
          return touchState$.pipe(
            map(x => x.touches),
            startWith(necessaryAmountOfTouchesReachedState.gestureStart),
            pairwise(),
            takeWhile(([prev, current]) => touchReleasedOrStayedSame(prev, current) && sameFingersWithinTolerance(current, necessaryAmountOfTouchesReachedState.gestureStart, TAP_TOLERANCE_PX)),
            filter(([prev, current]) => touchCount(current) === 0),
            take(1),
            map(() => necessaryAmountOfTouchesReachedState.gestureStart)
          )
        }),
        takeUntil(timer(TAP_TIME_MS))
      );
    })
  );
}

export function tapScreen(touchState$: Observable<TouchState>, fingerCount: number) {
  return tapInternal(touchState$, fingerCount).pipe(
    exhaustMap((tapEvent) => {
      return race(
        [
          of(tapEvent).pipe(delay(DOUBLE_TAP_TIME_MS)),
          touchState$.pipe(
            exhaustMap(() => interval(100).pipe(startWith(0))),
            take(2),
            map(() => null),
          )
        ]
      )
    }),
    filter(isNotNull)
  );
}

export function touchMove(touchState$: Observable<TouchState>, fingerCount: number) {

  return waitForPress(touchState$.pipe(map(x => x.touches)), fingerCount).pipe(
    switchMap(x => x),
    map(start => {
      return {
        startState: start,
        move$: touchState$.pipe(
          map(x => x.touches),
          takeWhile(state => touchCount(state) === touchCount(start.gestureStart)),
          skipWhile(current => sameFingersWithinTolerance(current, start.gestureStart, TAP_TOLERANCE_PX))
        )
      }
    })
  );
}

const SWIPE_MIN_TRAVEL_DISTANCE_PX = 200;

export function pan(touchState$: Observable<TouchState>, fingerCount: number) {
  return touchMove(touchState$, fingerCount).pipe(
    map((start) => {
      return start.move$.pipe(
        map((touches) => {
          return center(getCoordinates(touches));
        })
      )
    })
  );
}

export function pinch(touchState$: Observable<TouchState>) {
  return touchMove(touchState$, 2).pipe(
    map((start) => {
      const startDistance = magSq(sub(...getCoordinates(start.startState.gestureStart) as [Vector, Vector]));

      return start.move$.pipe(
        map((touches) => {
          return {
            center: center(getCoordinates(touches)),
            scale: Math.sqrt(
              magSq(sub(...getCoordinates(touches) as [Vector, Vector])) / startDistance
            )
          }
        })
      )
    })
  );
}
const DOUBLE_TAP_TIME_MS = 750;
export function doubleTap(touchState$: Observable<TouchState>, fingerCount: number) {
  return tapInternal(touchState$, fingerCount).pipe(
    exhaustMap((start) => {
      return tapInternal(touchState$, fingerCount).pipe(
        bufferTime(DOUBLE_TAP_TIME_MS),
        take(1),
        filter(x => x.length === 1),
        map(() => start)
      )
    })
  )
}

export function swipe(touchState$: Observable<TouchState>, fingerCount: number) {

  return touchMove(touchState$, fingerCount).pipe(
    map((start) => {
      return start.move$.pipe(
        takeLast(1),
        takeUntil(timer(500)),
        filter((lastEvent) => {
          return magSq(
            sub(
              ...arrMap(
                [start.startState.gestureStart, lastEvent], x => center(Object.values(x).map(y => y.position))
              )
            )
          ) > SWIPE_MIN_TRAVEL_DISTANCE_PX * SWIPE_MIN_TRAVEL_DISTANCE_PX;
        })
      )
    })
  )
}

export function waitForPress(touchState$: Observable<TouchRecord>, touchNumber: number) {
  return touchState$.pipe(
    startWith({}),
    pairwise(),
    filter(([prev, current]) => touchCount(prev) === 0 && touchCount(current) > 0),
    map(([_, startedState]) => {
      return touchState$.pipe(
        startWith(startedState),
        scan((acc, current) => {
          if (acc == null) {
            return null;
          }
          const newBase = collectTouches(acc.gestureStart, current);
          if (newBase == null) return null;
          return {
            gestureStart: newBase,
            current: current
          }
        }, {
          gestureStart: startedState,
          current: startedState
        } as {
          gestureStart: TouchRecord,
          current: TouchRecord
        } | null),
        takeWhile(x => {
          return x != null && sameFingersWithinTolerance(x.gestureStart, x.current, TAP_TOLERANCE_PX);
        }),
        filter(isNotNull),
        filter(x => touchCount(x.gestureStart) === touchNumber),
        take(1),
      )
    })
  );
}

export function getCoordinates(touches: TouchRecord) {
  return Object.values(touches).map(x => x.position);
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
