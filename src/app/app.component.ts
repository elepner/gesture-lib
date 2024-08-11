import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, merge, switchMap, tap } from 'rxjs';
import { isNotNull } from './utils';
import { fromHtmlElementEvent, tapScreen, toTouchObservable, toTouchState } from './gestures';
import { TouchEventData, touchEvents, TouchEventType } from './models';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'touch-lib';
  protected readonly targetEl = viewChild<ElementRef<HTMLDivElement>>('targetEl');

  touchState$ = toObservable(this.targetEl).pipe(
    filter(isNotNull),
    switchMap((ref) => toTouchState(ref.nativeElement))
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

    merge(...[1, 2, 3].map(count => tapScreen(this.touchState$, count).pipe(
      map((el) => ({
        count,
        event: el
      }))
    ))).subscribe(obj => {
      console.log(`Detected tap with ${obj.count} fingers`, obj.event);
    });


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
