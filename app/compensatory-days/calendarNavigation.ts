export function adjacentMonth(year: number, month: number, direction: -1 | 1) {
  const next = new Date(year, month + direction, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}
