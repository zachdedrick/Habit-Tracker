import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getErrorMessage } from '../lib/errors'
import { getWeekDates, todayStr } from '../lib/dates'
import type { Profile, Wager, HabitLog } from '../types'

export interface WagerWithProgress extends Wager {
  challenger?: Profile
  challenged?: Profile
  challengerProgress?: number // 0-1
  challengedProgress?: number // 0-1
  challengerResult?: 'won' | 'lost' | null
  challengedResult?: 'won' | 'lost' | null
}

export function useWagers() {
  const { user } = useAuth()
  const [wagers, setWagers] = useState<WagerWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: rawWagers, error: wagersError } = await supabase
        .from('wagers')
        .select('*, challenger:profiles!challenger_id(*), challenged:profiles!challenged_id(*)')
        .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (wagersError) throw wagersError

      const today = todayStr()
      const enriched: WagerWithProgress[] = await Promise.all(
        (rawWagers ?? []).map(async (wager) => {
          if (wager.status !== 'active' && wager.status !== 'completed') return wager

          const weekDates = getWeekDates(wager.week_start)
          const totalDays = weekDates.length

          async function getProgress(userId: string): Promise<number> {
            const { data: weekRow } = await supabase
              .from('weeks')
              .select('id')
              .eq('user_id', userId)
              .eq('start_date', wager.week_start)
              .maybeSingle()
            if (!weekRow) return 0

            const { data: habits } = await supabase
              .from('habits')
              .select('id')
              .eq('week_id', weekRow.id)
            if (!habits || habits.length === 0) return 0

            const { data: logs } = await supabase
              .from('habit_logs')
              .select('completed')
              .in('habit_id', habits.map((h: { id: string }) => h.id))
              .in('log_date', weekDates)
            if (!logs) return 0

            const completed = (logs as Pick<HabitLog, 'completed'>[]).filter((l) => l.completed).length
            return completed / (habits.length * totalDays)
          }

          const [challengerProgress, challengedProgress] = await Promise.all([
            getProgress(wager.challenger_id),
            getProgress(wager.challenged_id),
          ])

          const weekEnded = weekDates[6] < today
          const challengerResult = weekEnded
            ? challengerProgress * 100 >= wager.challenger_target_pct ? 'won' : 'lost'
            : null
          const challengedResult = weekEnded && wager.challenged_target_pct != null
            ? challengedProgress * 100 >= wager.challenged_target_pct ? 'won' : 'lost'
            : null

          if (weekEnded && wager.status === 'active') {
            void supabase.from('wagers').update({ status: 'completed' }).eq('id', wager.id)
          }

          return { ...wager, challengerProgress, challengedProgress, challengerResult, challengedResult }
        }),
      )

      setWagers(enriched)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load wagers'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function createWager(friendId: string, weekStart: string, myTargetPct: number, stake: string) {
    if (!user) return
    const { error: insertError } = await supabase.from('wagers').insert({
      challenger_id: user.id,
      challenged_id: friendId,
      week_start: weekStart,
      challenger_target_pct: myTargetPct,
      stake,
    })
    if (insertError) throw insertError
    await load()
  }

  async function respondToWager(wagerId: string, accept: boolean, myTargetPct?: number) {
    if (!user) return
    const update = accept
      ? { status: 'active', challenged_target_pct: myTargetPct }
      : { status: 'declined' }
    const { error: updateError } = await supabase.from('wagers').update(update).eq('id', wagerId)
    if (updateError) throw updateError
    await load()
  }

  async function cancelWager(wagerId: string) {
    const { error: updateError } = await supabase
      .from('wagers')
      .update({ status: 'cancelled' })
      .eq('id', wagerId)
    if (updateError) throw updateError
    await load()
  }

  const pendingIncoming = wagers.filter((w) => w.status === 'pending' && w.challenged_id === user?.id)
  const pendingOutgoing = wagers.filter((w) => w.status === 'pending' && w.challenger_id === user?.id)
  const active = wagers.filter((w) => w.status === 'active')
  const completed = wagers.filter((w) => w.status === 'completed')

  return { wagers, pendingIncoming, pendingOutgoing, active, completed, loading, error, createWager, respondToWager, cancelWager, reload: load }
}
