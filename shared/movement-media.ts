/** One canvas for every movement, pose and demonstrator. Independent of frame count. */
export const movementMediaSpec = {
  aspectRatio: 1,
  targetWidth: 1024,
  targetHeight: 1024,
} as const;

export function isMovementCanvas(width: number, height: number) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width === height
  );
}
