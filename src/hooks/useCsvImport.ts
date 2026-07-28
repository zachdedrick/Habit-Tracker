import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getWeekStart } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import type { ParsedCsv } from '../lib/csv'

export interface ImportProgress {
  totalWeeks: number
  completedWeeks: number
}

const CHUNK_SIZE = 500

export function useCsvImport() {
  const { user } = useAuth()
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importData(parsed: ParsedCsv) {
    if (!user) return
    setImporting(true)
    setError(null)

    try {
      // Group entries by the Monday-aligned week they fall in.
      const weekGroups = new Map<string, { date: string; values: Record<string, boolean> }[]>()
      for (const entry of parsed.entries) {
        const weekStart = getWeekStart(new Date(`${entry.date}T00:00:00`))
        const group = weekGroups.get(weekStart) ?? []
        group.push(entry)
        weekGroups.set(weekStart, group)
      }

      const sortedWeekStarts = Array.from(weekGroups.keys()).sort()
      setProgress({ totalWeeks: sortedWeekStarts.length, completedWeeks: 0 })

      for (const weekStart of sortedWeekStarts) {
        const entries = weekGroups.get(weekStart)!

        // Get or create the week row.
        let { data: weekRow } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user.id)
          .eq('start_date', weekStart)
          .maybeSingle()

        if (!weekRow) {
          const { data: inserted, error: insertError } = await supabase
            .from('weeks')
            .insert({ user_id: user.id, start_date: weekStart })
            .select('*')
            .single()
          if (insertError) throw insertError
          weekRow = inserted
        }

        // Get existing habits for this week, and create any that are missing.
        const { data: existingHabits, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('week_id', weekRow!.id)
        if (habitsError) throw habitsError

        const habitIdByName = new Map<string, string>()
        for (const habit of existingHabits ?? []) {
          habitIdByName.set(habit.name, habit.id)
        }

        const missingNames = parsed.habitNames.filter((name) => !habitIdByName.has(name))
        if (missingNames.length > 0) {
          let position = existingHabits?.length ?? 0
          const rows = missingNames.map((name) => ({
            user_id: user.id,
            week_id: weekRow!.id,
            name,
            position: position++,
          }))
          const { data: createdHabits, error: createError } = await supabase
            .from('habits')
            .insert(rows)
            .select('*')
          if (createError) throw createError
          for (const habit of createdHabits ?? []) {
            habitIdByName.set(habit.name, habit.id)
          }
        }

        // Build habit_logs upserts — only for completed=true entries so imported
        // zeros/blanks stay as unchecked (no row) rather than red ✗.
        const logRows = entries.flatMap((entry) =>
          parsed.habitNames
            .filter((name) => entry.values[name] === true)
            .map((name) => ({
              user_id: user.id,
              habit_id: habitIdByName.get(name)!,
              log_date: entry.date,
              completed: true,
              updated_at: new Date().toISOString(),
            })),
        )

        for (let i = 0; i < logRows.length; i += CHUNK_SIZE) {
          const chunk = logRows.slice(i, i + CHUNK_SIZE)
          const { error: upsertError } = await supabase
            .from('habit_logs')
            .upsert(chunk, { onConflict: 'habit_id,log_date' })
          if (upsertError) throw upsertError
        }

        setProgress((prev) => (prev ? { ...prev, completedWeeks: prev.completedWeeks + 1 } : prev))
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Import failed'))
      throw err
    } finally {
      setImporting(false)
    }
  }

  return { importData, importing, progress, error }
}
