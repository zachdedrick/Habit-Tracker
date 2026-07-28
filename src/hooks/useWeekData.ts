import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getWeekDates } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import type { Habit, HabitLog, Week, WeeklyBonus } from '../types'

export function logKey(habitId: string, date: string) {
  return `${habitId}__${date}`
}

export function useWeekData(weekStart: string) {
  const { user } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Record<string, HabitLog>>({})
  const [bonuses, setBonuses] = useState<WeeklyBonus[]>([])
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

      const { data: bonusRows, error: bonusError } = await supabase
        .from('weekly_bonuses')
        .select('*')
        .eq('week_id', weekRow!.id)
        .order('created_at', { ascending: true })
      if (bonusError) throw bonusError
      setBonuses(bonusRows ?? [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load week'))
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

    // Three-state cycle: no row → completed=true → completed=false → delete row
    if (!existing) {
      // unchecked → green ✓
      const { data, error: upsertError } = await supabase
        .from('habit_logs')
        .insert({
          user_id: user.id,
          habit_id: habitId,
          log_date: date,
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (upsertError) throw upsertError
      setLogs((prev) => ({ ...prev, [key]: data }))
    } else if (existing.completed) {
      // green ✓ → red ✗
      const { data, error: upsertError } = await supabase
        .from('habit_logs')
        .update({ completed: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (upsertError) throw upsertError
      setLogs((prev) => ({ ...prev, [key]: data }))
    } else {
      // red ✗ → delete row (back to unchecked)
      const { error: deleteError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existing.id)
      if (deleteError) throw deleteError
      setLogs((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
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

  async function addBonus(name: string) {
    if (!user || !week) return
    const trimmed = name.trim()
    if (!trimmed) return
    const { data, error: insertError } = await supabase
      .from('weekly_bonuses')
      .insert({ user_id: user.id, week_id: week.id, name: trimmed })
      .select('*')
      .single()
    if (insertError) throw insertError
    setBonuses((prev) => [...prev, data])
  }

  async function removeBonus(id: string) {
    const { error: deleteError } = await supabase.from('weekly_bonuses').delete().eq('id', id)
    if (deleteError) throw deleteError
    setBonuses((prev) => prev.filter((b) => b.id !== id))
  }

  return {
    week,
    habits,
    logs,
    bonuses,
    loading,
    error,
    reload: load,
    addHabit,
    renameHabit,
    deleteHabit,
    copyHabitsFrom,
    toggleCompleted,
    setNote,
    addBonus,
    removeBonus,
  }
}
