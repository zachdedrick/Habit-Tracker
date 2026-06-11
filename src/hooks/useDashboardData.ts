import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getWeekDates } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import type { Habit, HabitLog, Week } from '../types'

export interface HabitSummary {
  habit: Habit
  completedCount: number
  totalDays: number
  rate: number
  notes: { date: string; note: string }[]
}

export interface DashboardData {
  week: Week
  dates: string[]
  habitSummaries: HabitSummary[]
  overallCompleted: number
  overallTotal: number
  overallRate: number
}

export function useDashboardData(weekId: string | undefined) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!weekId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: week, error: weekError } = await supabase
          .from('weeks')
          .select('*')
          .eq('id', weekId)
          .single()
        if (weekError) throw weekError

        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('week_id', weekId)
          .order('position', { ascending: true })
        if (habitsError) throw habitsError

        const dates = getWeekDates(week.start_date)
        const habitIds = (habits ?? []).map((h: Habit) => h.id)

        let logs: HabitLog[] = []
        if (habitIds.length > 0) {
          const { data: logRows, error: logsError } = await supabase
            .from('habit_logs')
            .select('*')
            .in('habit_id', habitIds)
            .in('log_date', dates)
          if (logsError) throw logsError
          logs = logRows ?? []
        }

        const habitSummaries: HabitSummary[] = (habits ?? []).map((habit: Habit) => {
          const habitLogs = logs.filter((l) => l.habit_id === habit.id)
          const completedCount = habitLogs.filter((l) => l.completed).length
          const notes = habitLogs
            .filter((l) => l.note && l.note.trim().length > 0)
            .map((l) => ({ date: l.log_date, note: l.note as string }))
            .sort((a, b) => a.date.localeCompare(b.date))

          return {
            habit,
            completedCount,
            totalDays: dates.length,
            rate: dates.length > 0 ? completedCount / dates.length : 0,
            notes,
          }
        })

        const overallCompleted = habitSummaries.reduce((sum, h) => sum + h.completedCount, 0)
        const overallTotal = habitSummaries.reduce((sum, h) => sum + h.totalDays, 0)

        if (!cancelled) {
          setData({
            week,
            dates,
            habitSummaries,
            overallCompleted,
            overallTotal,
            overallRate: overallTotal > 0 ? overallCompleted / overallTotal : 0,
          })
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load dashboard'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [weekId])

  return { data, loading, error }
}
