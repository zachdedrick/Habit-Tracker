import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getErrorMessage } from '../lib/errors'
import { getWeekDates } from '../lib/dates'
import { format } from 'date-fns'
import type { Habit, Week } from '../types'

interface LogRow { habit_id: string; log_date: string; completed: boolean }

export interface WeekPoint {
  weekStart: string
  label: string // e.g. "Jun 2"
  overall: number // 0-1
  byHabit: Record<string, number> // habit name -> 0-1
}

export function useWeeklyTrend() {
  const { user } = useAuth()
  const [points, setPoints] = useState<WeekPoint[]>([])
  const [habitNames, setHabitNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: weeks, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user!.id)
          .order('start_date', { ascending: true })
        if (weeksError) throw weeksError
        if (!weeks || weeks.length === 0) { setPoints([]); return }

        const weekIds = weeks.map((w: Week) => w.id)

        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .in('week_id', weekIds)
        if (habitsError) throw habitsError

        const habitIds = (habits ?? []).map((h: Habit) => h.id)
        let logs: LogRow[] = []
        if (habitIds.length > 0) {
          const { data: logRows, error: logsError } = await supabase
            .from('habit_logs')
            .select('habit_id, log_date, completed')
            .in('habit_id', habitIds)
          if (logsError) throw logsError
          logs = logRows ?? []
        }

        // Build lookup: habit_id+date -> completed
        const logMap = new Map<string, boolean>()
        for (const log of logs) {
          logMap.set(`${log.habit_id}__${log.log_date}`, log.completed)
        }

        const allHabitNames = new Set<string>()
        const weekPoints: WeekPoint[] = []

        for (const week of weeks) {
          const weekHabits = (habits ?? []).filter((h: Habit) => h.week_id === week.id)
          const dates = getWeekDates(week.start_date)
          const totalDays = dates.length

          let totalCompleted = 0
          let totalPossible = 0
          const byHabit: Record<string, number> = {}

          for (const habit of weekHabits) {
            allHabitNames.add(habit.name)
            const completed = dates.filter((d) => logMap.get(`${habit.id}__${d}`)).length
            totalCompleted += completed
            totalPossible += totalDays
            byHabit[habit.name] = totalDays > 0 ? completed / totalDays : 0
          }

          weekPoints.push({
            weekStart: week.start_date,
            label: format(new Date(`${week.start_date}T00:00:00`), 'MMM d'),
            overall: totalPossible > 0 ? totalCompleted / totalPossible : 0,
            byHabit,
          })
        }

        if (!cancelled) {
          setPoints(weekPoints)
          setHabitNames(Array.from(allHabitNames).sort())
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load trend data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user])

  return { points, habitNames, loading, error }
}
