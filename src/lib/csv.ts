import Papa from 'papaparse'
import { parseFlexibleDate } from './dates'

export interface ParsedCsv {
  habitNames: string[]
  entries: { date: string; values: Record<string, boolean> }[]
  skippedRows: number
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'x'])

/**
 * Parses a "wide" CSV export: first column is a date, remaining columns are habit names
 * with 1/empty (or true/false/x) values indicating completion.
 */
export function parseHabitCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0].message)
  }

  const fields = result.meta.fields ?? []
  if (fields.length < 2) {
    throw new Error('CSV must have a date column and at least one habit column.')
  }

  const dateField = fields[0]
  const habitNames = fields.slice(1).filter((f) => f.length > 0)

  const entries: { date: string; values: Record<string, boolean> }[] = []
  let skippedRows = 0

  for (const row of result.data) {
    const rawDate = row[dateField] ?? ''
    const date = parseFlexibleDate(rawDate)
    if (!date) {
      if (rawDate.trim().length > 0) skippedRows++
      continue
    }

    const values: Record<string, boolean> = {}
    for (const habitName of habitNames) {
      const raw = (row[habitName] ?? '').trim().toLowerCase()
      values[habitName] = TRUE_VALUES.has(raw)
    }

    entries.push({ date, values })
  }

  entries.sort((a, b) => a.date.localeCompare(b.date))

  return { habitNames, entries, skippedRows }
}
