import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getWeekDates } from '../lib/dates'
import type { Habit, HabitLog, Week } from '../types'

export function logKey(habitId: string, date: string) {
  return `${habitId}__${date}`
}

export function useWeekData(weekStart: string) {
  const { user } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Record<string, HabitLog>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      // Get or create the week row
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
      setWeek(weekRow)

      const { data: habitRows, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('week_id', weekRow!.id)
        .order('position', { ascending: true })
      if (habitsError) throw habitsError
      setHabits(habitRows ?? [])

      const habitIds = (habitRows ?? []).map((h) => h.id)
      const dates = getWeekDates(weekStart)

      if (habitIds.length > 0) {
        const { data: logRows, error: logsError } = await supabase
          .from('habit_logs')
          .select('*')
          .in('habit_id', habitIds)
          .in('log_date', dates)
        if (logsError) throw logsError

        const logMap: Record<string, HabitLog> = {}
        for (const log of logRows ?? []) {
          logMap[logKey(log.habit_id, log.log_date)] = log
        }
        setLogs(logMap)
      } else {
        setLogs({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load week')
    } finally {
      setLoading(false)
    }
  }, [user, weekStart])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function addHabit(name: string) {
    if (!user || !week) return
    const trimmed = name.trim()
    if (!trimmed) return
    const position = habits.length
    const { data, error: insertError } = await supabase
      .from('habits')
      .insert({ user_id: user.id, week_id: week.id, name: trimmed, position })
      .select('*')
      .single()
    if (insertError) throw insertError
    setHabits((prev) => [...prev, data])
  }

  async function renameHabit(habitId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error: updateError } = await supabase
      .from('habits')
      .update({ name: trimmed })
      .eq('id', habitId)
    if (updateError) throw updateError
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, name: trimmed } : h)))
  }

  async function deleteHabit(habitId: string) {
    const { error: deleteError } = await supabase.from('habits').delete().eq('id', habitId)
    if (deleteError) throw deleteError
    setHabits((prev) => prev.filter((h) => h.id !== habitId))
    setLogs((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${habitId}__`)) delete next[key]
      }
      return next
    })
  }

  async function copyHabitsFrom(sourceWeekId: string) {
    if (!user || !week) return
    const { data: sourceHabits, error: fetchError } = await supabase
      .from('habits')
      .select('*')
      .eq('week_id', sourceWeekId)
      .order('position', { ascending: true })
    if (fetchError) throw fetchError
    if (!sourceHabits || sourceHabits.length === 0) return

    const rows = sourceHabits.map((h) => ({
      user_id: user.id,
      week_id: week.id,
      name: h.name,
      position: h.position,
    }))
    const { data, error: insertError } = await supabase.from('habits').insert(rows).select('*')
    if (insertError) throw insertError
    setHabits(data ?? [])
  }

  async function toggleCompleted(habitId: string, date: string) {
    if (!user) return
    const key = logKey(habitId, date)
    const existing = logs[key]
    const completed = !existing?.completed

    const { data, error: upsertError } = await supabase
      .from('habit_logs')
      .upsert(
        {
          id: existing?.id,
          user_id: user.id,
          habit_id: habitId,
          log_date: date,
          completed,
          note: existing?.note ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'habit_id,log_date' },
      )
      .select('*')
      .single()
    if (upsertError) throw upsertError
    setLogs((prev) => ({ ...prev, [key]: data }))
  }

  async function setNote(habitId: string, date: string, note: string) {
    if (!user) return
    const key = logKey(habitId, date)
    const existing = logs[key]
    const trimmed = note.trim()

    const { data, error: upsertError } = await supabase
      .from('habit_logs')
      .upsert(
        {
          id: existing?.id,
          user_id: user.id,
          habit_id: habitId,
          log_date: date,
          completed: existing?.completed ?? false,
          note: trimmed.length > 0 ? trimmed : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'habit_id,log_date' },
      )
      .select('*')
      .single()
    if (upsertError) throw upsertError
    setLogs((prev) => ({ ...prev, [key]: data }))
  }

  return {
    week,
    habits,
    logs,
    loading,
    error,
    reload: load,
    addHabit,
    renameHabit,
    deleteHabit,
    copyHabitsFrom,
    toggleCompleted,
    setNote,
  }
}
