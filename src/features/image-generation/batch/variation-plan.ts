import type { Variation, VisualBrief } from "../brief/types";
import { BATCH_SIZE } from "../domain/options";

// Only the axes in brief.variationPolicy.variable change; style, palette, format and required
// rules stay fixed across the batch. 3 angles × 5 placements = 15 distinct compositions.
const CAMERA_ANGLES = [
  "at eye level",
  "from a low angle in three-quarter view",
  "from a slightly high angle",
] as const;

const PLACEMENTS = [
  "The main subject stands in the left third of the frame",
  "The main subject stands in the right third of the frame",
  "The main subject is centred with symmetrical space around it",
  "The main subject is small in the frame, with its surroundings dominant",
  "A close-up on the main subject with a shallow depth of field",
] as const;

export function planVariations(brief: VisualBrief, count: number): Variation[] {
  if (count === 1) {
    return [
      {
        index: 0,
        axes: {
          cameraAngle: brief.composition.cameraAngle,
          placement: brief.composition.placement,
        },
      },
    ];
  }
  if (!Number.isInteger(count) || count < 1 || count > BATCH_SIZE) {
    throw new RangeError(
      `count must be between 1 and ${BATCH_SIZE}, got ${count}`,
    );
  }
  return Array.from({ length: count }, (_, index) => ({
    index,
    axes: {
      cameraAngle:
        CAMERA_ANGLES[index % CAMERA_ANGLES.length] ??
        brief.composition.cameraAngle,
      placement:
        PLACEMENTS[
          Math.floor(index / CAMERA_ANGLES.length) % PLACEMENTS.length
        ] ?? brief.composition.placement,
    },
  }));
}
