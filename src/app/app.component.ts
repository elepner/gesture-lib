import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, merge, of, share, switchMap, take, timer } from 'rxjs';
import { isNotNull } from './utils';
import { fromHtmlElementEvent, getCoordinates, swipe, toTouchState, touchMove } from './gestures';
import { center } from './math';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'touch-lib';
  protected readonly targetEl = viewChild<ElementRef<HTMLDivElement>>('targetEl');

  touchState$ = toObservable(this.targetEl).pipe(
    filter(isNotNull),
    switchMap((ref) => toTouchState(ref.nativeElement)),
    share()
  )

  readonly colors = ['red', 'green', 'blue'] as const;

  toches$ = this.touchState$.pipe(map((state) => {
    return Object.entries(state.touches).map(([id, state], index) => {
      return {
        id,
        color: this.colors[index] ?? 'pink',
        position: state.position
      }
    })
  }))

  swipe$ = merge(...[1, 2, 3].map(
    c => swipe(this.touchState$, c).pipe(
      switchMap((val) => val),
      switchMap(val => {
        return merge(of({
          center: center(getCoordinates(val)),
          type: 'Swipe'
        } as const), timer(1500).pipe(take(1), map(() => null)))
      })
    ),
  ))

  constructor() {
    // toObservable(this.targetEl).pipe(
    //   filter(isNotNull),
    //   switchMap((el) => {
    //     const obs$ = touchEvents.map((evtType) => toTouchObservable(el.nativeElement, evtType).pipe((
    //       map((event) => {
    //         return [evtType, event] satisfies [TouchEventType, TouchEventData]
    //       }))));
    //     return merge(...obs$)
    //   })
    // ).subscribe(obj => {
    //   console.log('touch stuff', obj);
    // });

    // this.touchState$.subscribe(obj => {
    //   console.log('Touch state', obj);
    // });
    /* 
        merge(...[1, 2, 3].map(count => tapScreen(this.touchState$, count).pipe(
          map((el) => ({
            count,
            event: el
          }))
        ))).subscribe(obj => {
          console.log(`Detected tap with ${obj.count} fingers`, obj.event);
        });
     */
    /*  merge(...[1, 2, 3].map(count => touchMove(this.touchState$, count).pipe(
       switchMap(x => x.move$.pipe(
         materialize(),
         map((notification) => {
           if (notification.kind === 'N') {
             return [`Moving with ${count} fingers`, getCoordinates(notification.value)];
           } else {
             return [`Finished moving ${count} fingers`];
           }
         })
       ))
 
     ))).subscribe(obj => {
       console.log('Waiting for move', obj)
       // console.log(`Detected tap with ${obj.count} fingers`, obj.event);
     });
  */



    merge(...[1, 2, 3].map(
      c => swipe(this.touchState$, c).pipe(
        switchMap((val) => val),
        switchMap(val => {
          return merge(of({
            center: center(getCoordinates(val)),
            type: 'Swipe'
          } as const), timer(750).pipe(take(1), map(() => null)))
        })
      ),
    )).subscribe(obj => {
      console.log('Swipe', obj);
    });;

    toObservable(this.targetEl).pipe(
      filter(isNotNull),
      switchMap((ref) => fromHtmlElementEvent(ref.nativeElement, 'touchmove'))
    ).subscribe(evt => {
      evt.preventDefault();
    });
  }

  disableContextMenu(event: Event) {
    event.preventDefault();
  }
}
