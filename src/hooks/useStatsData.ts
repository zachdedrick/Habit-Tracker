import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { daysAgoStr, getWeekDates, getWeekStart, todayStr } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import type { Habit, HabitLog, Week } from '../types'

export interface HabitRate {
  name: string
  completed: number
  total: number
  rate: number
}

export interface StatsData {
  todayRate: number
  weekAvgDailyRate: number
  weekTotalRate: number
  monthRate: number
  bestHabits: HabitRate[]
  worstHabits: HabitRate[]
}

const TOP_BOTTOM_COUNT = 3

export function useStatsData() {
  const { user } = useAuth()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const today = todayStr()
        const monthStart = daysAgoStr(29)
        const currentWeekStart = getWeekStart()
        const earliestWeekStart = getWeekStart(new Date(`${monthStart}T00:00:00`))

        const { data: weeks, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user!.id)
          .gte('start_date', earliestWeekStart)
          .lte('start_date', currentWeekStart)
          .order('start_date', { ascending: true })
        if (weeksError) throw weeksError

        const weekIds = (weeks ?? []).map((w: Week) => w.id)
        let habits: Habit[] = []
        if (weekIds.length > 0) {
          const { data: habitRows, error: habitsError } = await supabase
            .from('habits')
            .select('*')
            .in('week_id', weekIds)
          if (habitsError) throw habitsError
          habits = habitRows ?? []
        }

        let logs: HabitLog[] = []
        if (habits.length > 0) {
          const { data: logRows, error: logsError } = await supabase
            .from('habit_logs')
            .select('*')
            .in('habit_id', habits.map((h) => h.id))
            .gte('log_date', monthStart)
            .lte('log_date', today)
          if (logsError) throw logsError
          logs = logRows ?? []
        }

        const logMap = new Map<string, HabitLog>()
        for (const log of logs) {
          logMap.set(`${log.habit_id}__${log.log_date}`, log)
        }

        // --- Today & current-week stats (current week's habits only) ---
        const currentWeek = (weeks ?? []).find((w: Week) => w.start_date === currentWeekStart)
        const currentWeekHabits = currentWeek ? habits.filter((h) => h.week_id === currentWeek.id) : []
        const weekDates = currentWeek ? getWeekDates(currentWeek.start_date) : []
        const weekDatesSoFar = weekDates.filter((d) => d <= today)

        const habitCount = currentWeekHabits.length

        let todayRate = 0
        if (habitCount > 0) {
          const completedToday = currentWeekHabits.filter((h) => logMap.get(`${h.id}__${today}`)?.completed).length
          todayRate = completedToday / habitCount
        }

        let weekAvgDailyRate = 0
        if (habitCount > 0 && weekDatesSoFar.length > 0) {
          const dailyRates = weekDatesSoFar.map((date) => {
            const completed = currentWeekHabits.filter((h) => logMap.get(`${h.id}__${date}`)?.completed).length
            return completed / habitCount
          })
          weekAvgDailyRate = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length
        }

        let weekTotalRate = 0
        if (habitCount > 0) {
          const totalCompleted = currentWeekHabits.reduce(
            (sum, h) => sum + weekDates.filter((date) => logMap.get(`${h.id}__${date}`)?.completed).length,
            0,
          )
          let bonusCount = 0
          if (currentWeek) {
            const { data: bonusRows } = await supabase
              .from('weekly_bonuses')
              .select('id')
              .eq('week_id', currentWeek.id)
            bonusCount = bonusRows?.length ?? 0
          }
          weekTotalRate = (totalCompleted + bonusCount) / (habitCount * weekDates.length)
        }

        // --- Rolling 30-day stats, grouped by habit name ---
        const nameStats = new Map<string, { completed: number; total: number }>()
        let monthCompleted = 0
        let monthTotal = 0

        for (const week of weeks ?? []) {
          const dates = getWeekDates(week.start_date).filter((d) => d >= monthStart && d <= today)
          if (dates.length === 0) continue
          const weekHabits = habits.filter((h) => h.week_id === week.id)
          for (const habit of weekHabits) {
            const completed = dates.filter((d) => logMap.get(`${habit.id}__${d}`)?.completed).length
            const total = dates.length
            monthCompleted += completed
            monthTotal += total

            const existing = nameStats.get(habit.name) ?? { completed: 0, total: 0 }
            existing.completed += completed
            existing.total += total
            nameStats.set(habit.name, existing)
          }
        }

        const monthRate = monthTotal > 0 ? monthCompleted / monthTotal : 0

        const habitRates: HabitRate[] = Array.from(nameStats.entries()).map(([name, { completed, total }]) => ({
          name,
          completed,
          total,
          rate: total > 0 ? completed / total : 0,
        }))
        habitRates.sort((a, b) => b.rate - a.rate)

        const bestHabits = habitRates.slice(0, TOP_BOTTOM_COUNT)
        const remaining = habitRates.length - TOP_BOTTOM_COUNT
        const worstHabits = remaining > 0 ? habitRates.slice(-Math.min(TOP_BOTTOM_COUNT, remaining)).reverse() : []

        if (!cancelled) {
          setData({
            todayRate,
            weekAvgDailyRate,
            weekTotalRate,
            monthRate,
            bestHabits,
            worstHabits,
          })
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load stats'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  return { data, loading, error }
}
