/** Tilt answers with a heavier border on that side. A deeper lean keeps adding width. */
export function movementGlass(lean: number) {
  const tilt =
    Number.isFinite(lean) && Math.abs(lean) >= 0.04 ? Math.max(-1, Math.min(1, lean)) : 0;
  const left = Math.max(0, -tilt);
  const right = Math.max(0, tilt);
  return {
    left,
    right,
    leftBorder: 1.25 + left * 2.5,
    rightBorder: 1.25 + right * 2.5,
  };
}
