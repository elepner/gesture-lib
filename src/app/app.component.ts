import { Component, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, merge, switchMap } from 'rxjs';
import { isNotNull } from './utils';
import { fromHtmlElementEvent, toTouchObservable, TouchEventData, touchEvents, TouchEventType } from './gestures';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="height: 100svh; display: flex; flex-direction: column;">
      <div style="flex-grow: 1; background-color: cyan" #targetEl></div>
      <div>hello world</div>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  title = 'touch-lib';
  protected readonly targetEl = viewChild<ElementRef<HTMLDivElement>>('targetEl');
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

    toObservable(this.targetEl).pipe(
      filter(isNotNull),
      switchMap((ref) => fromHtmlElementEvent(ref.nativeElement, 'touchmove'))
    ).subscribe(evt => {
      evt.preventDefault();
    });
  }
}
