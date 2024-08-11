import { Vector } from "./math";

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
export type TouchEventType = (typeof touchEvents)[number];
export type TouchRecord = Record<string, { position: Vector, timestamp: number }>;
export interface TouchState {
  lastUpdate: number;
  touches: TouchRecord;
  lastEventType: TouchEventType;
}

