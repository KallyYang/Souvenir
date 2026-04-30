export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function formatMonth(d: Date): string {
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export function formatFullDate(d: Date): string {
  const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()} 年 ${mm} 月 ${dd} 日 · 周${w}`;
}
