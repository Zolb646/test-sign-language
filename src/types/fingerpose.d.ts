declare module "fingerpose" {
  export class GestureDescription {
    constructor(name: string);
    addCurl(finger: number, curl: number, confidence: number): void;
    addDirection(finger: number, direction: number, confidence: number): void;
  }

  export class GestureEstimator {
    constructor(gestures: GestureDescription[]);
    estimate(
      landmarks: [number, number, number][],
      minConfidence: number,
    ): {
      gestures: Array<{ name: string; score: number }>;
      poseData: unknown;
    };
  }

  export const Finger: {
    Thumb: 0;
    Index: 1;
    Middle: 2;
    Ring: 3;
    Pinky: 4;
  };

  export const FingerCurl: {
    NoCurl: 0;
    HalfCurl: 1;
    FullCurl: 2;
  };

  export const FingerDirection: {
    VerticalUp: 0;
    VerticalDown: 1;
    HorizontalLeft: 2;
    HorizontalRight: 3;
    DiagonalUpLeft: 4;
    DiagonalUpRight: 5;
    DiagonalDownLeft: 6;
    DiagonalDownRight: 7;
  };
}
