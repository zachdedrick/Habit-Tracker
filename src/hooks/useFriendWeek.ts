import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { getWeekDates } from '../lib/dates'
import type { Habit, HabitLog, Week } from '../types'
import { logKey } from './useWeekData'

export function useFriendWeek(friendId: string, weekStart: string) {
  const [week, setWeek] = useState<Week | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Record<string, HabitLog>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: weekRow } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', friendId)
          .eq('start_date', weekStart)
          .maybeSingle()
        if (!weekRow) { setWeek(null); setHabits([]); setLogs({}); return }
        setWeek(weekRow)

        const { data: habitRows, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('week_id', weekRow.id)
          .order('position', { ascending: true })
        if (habitsError) throw habitsError
        setHabits(habitRows ?? [])

        const habitIds = (habitRows ?? []).map((h: Habit) => h.id)
        const dates = getWeekDates(weekStart)
        if (habitIds.length > 0) {
          const { data: logRows, error: logsError } = await supabase
            .from('habit_logs')
            .select('id, habit_id, log_date, completed, user_id, updated_at')
            .in('habit_id', habitIds)
            .in('log_date', dates)
          if (logsError) throw logsError
          const map: Record<string, HabitLog> = {}
          for (const log of logRows ?? []) {
            map[logKey(log.habit_id, log.log_date)] = { ...log, note: null }
          }
          setLogs(map)
        } else {
          setLogs({})
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load friend's data"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [friendId, weekStart])

  return { week, habits, logs, loading, error }
}
