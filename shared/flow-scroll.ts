export function topicAtOffset(
  sections: { id: string; y: number }[],
  offset: number,
  headerHeight: number,
) {
  const ordered = sections.filter(item => Number.isFinite(item.y)).sort((a, b) => a.y - b.y);
  const threshold =
    (Number.isFinite(offset) ? Math.max(0, offset) : 0) + Math.max(0, headerHeight) + 12;
  return [...ordered].reverse().find(item => item.y <= threshold)?.id ?? ordered[0]?.id;
}
