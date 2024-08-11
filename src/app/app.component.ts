import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, merge, switchMap } from 'rxjs';
import { isNotNull } from './utils';
import { fromHtmlElementEvent, toTouchObservable, toTouchState, TouchEventData, touchEvents, TouchEventType } from './gestures';
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
    return Object.entries(state).map(([id, state], index) => {
      return {
        id,
        color: this.colors[index] ?? 'pink',
        position: state.position
      }
    })
  }))

  constructor() {
    toObservable(this.targetEl).pipe(
      filter(isNotNull),
      switchMap((el) => {
        const obs$ = touchEvents.map((evtType) => toTouchObservable(el.nativeElement, evtType).pipe((
          map((event) => {
            return [evtType, event] satisfies [TouchEventType, TouchEventData]
          }))));
        return merge(...obs$)
      })
    ).subscribe(obj => {
      console.log('touch stuff', obj);
    });

    // this.touchState$.subscribe(obj => {
    //   console.log('Touch state', obj);
    // });

    toObservable(this.targetEl).pipe(
      filter(isNotNull),
      switchMap((ref) => fromHtmlElementEvent(ref.nativeElement, 'touchmove'))
    ).subscribe(evt => {
      evt.preventDefault();
    });
  }
}
