import { addDays, addWeeks, format, startOfWeek, subDays } from 'date-fns'

/** Returns the ISO date string (yyyy-MM-dd) for the Monday of the week containing `date`. */
export function getWeekStart(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** Returns the 7 ISO date strings (Mon..Sun) for the week starting on `weekStart`. */
export function getWeekDates(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00`)
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

export function formatDateLong(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), 'EEEE, MMM d')
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), 'EEE M/d')
}

export function formatWeekRange(weekStart: string): string {
  const dates = getWeekDates(weekStart)
  const start = new Date(`${dates[0]}T00:00:00`)
  const end = new Date(`${dates[6]}T00:00:00`)
  const sameMonth = start.getMonth() === end.getMonth()
  return sameMonth
    ? `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
    : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function shiftWeek(weekStart: string, weeks: number): string {
  return format(addWeeks(new Date(`${weekStart}T00:00:00`), weeks), 'yyyy-MM-dd')
}

export function dayLabel(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), 'EEE')
}

export function dayNumber(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), 'd')
}

export function daysAgoStr(n: number): string {
  return format(subDays(new Date(), n), 'yyyy-MM-dd')
}
