// The order a how-to loop shows its frames. Two frames alternate; three or more go back and forth
// (1, 2, 3, 2, 1, …), so the movement never jumps from the end straight back to the start.

export function loopOrder(count: number): number[] {
  if (count < 2) return count === 1 ? [0] : [];
  const forward = Array.from({ length: count }, (_, index) => index);
  if (count === 2) return forward;
  return [...forward, ...forward.slice(1, -1).reverse()];
}

/** The start and end positions hold longer than the frames in between, so the shape of the move reads. */
export function isEndFrame(index: number, count: number) {
  return index === 0 || index === count - 1;
}
