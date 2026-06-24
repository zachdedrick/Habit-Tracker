import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFriendWeek } from '../hooks/useFriendWeek'
import { useWagers } from '../hooks/useWagers'
import { dayLabel, dayNumber, formatWeekRange, getWeekDates, getWeekStart, shiftWeek, todayStr } from '../lib/dates'
import { logKey } from '../hooks/useWeekData'

const WEEKS = [0, 1, 2].map((n) => {
  const ws = n === 0 ? getWeekStart() : shiftWeek(getWeekStart(), n)
  return { label: n === 0 ? 'This week' : n === 1 ? 'Next week' : formatWeekRange(ws), value: ws }
})

export default function FriendProfile() {
  const { friendId } = useParams<{ friendId: string }>()
  const navigate = useNavigate()
  const today = todayStr()

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [showWagerForm, setShowWagerForm] = useState(false)
  const [wagerWeek, setWagerWeek] = useState(WEEKS[0].value)
  const [myTarget, setMyTarget] = useState(80)
  const [stake, setStake] = useState('')
  const [wagerSending, setWagerSending] = useState(false)
  const [wagerError, setWagerError] = useState<string | null>(null)
  const [wagerSent, setWagerSent] = useState(false)

  const { habits, logs, loading, error } = useFriendWeek(friendId ?? '', weekStart)
  const { createWager } = useWagers()

  const dates = getWeekDates(weekStart)

  const totalPossible = habits.length * dates.length
  const totalCompleted = habits.reduce(
    (sum, h) => sum + dates.filter((d) => logs[logKey(h.id, d)]?.completed).length,
    0,
  )
  const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0

  async function handleWager(e: FormEvent) {
    e.preventDefault()
    if (!friendId) return
    setWagerError(null)
    setWagerSending(true)
    try {
      await createWager(friendId, wagerWeek, myTarget, stake)
      setWagerSent(true)
      setShowWagerForm(false)
    } catch (err) {
      setWagerError(err instanceof Error ? err.message : 'Failed to create wager')
    } finally {
      setWagerSending(false)
    }
  }

  return (
    <div className="p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-indigo-600">← Back</button>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Friend's week</h2>
          <p className="text-sm text-slate-500">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600">{completionRate}%</p>
          <p className="text-xs text-slate-400">completion</p>
        </div>
      </div>

      {/* Week selector */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >←</button>
        <span className="flex-1 text-center text-sm text-slate-600 py-1">{formatWeekRange(weekStart)}</span>
        <button
          type="button"
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >→</button>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && habits.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No habits set for this week.</p>
      )}

      {!loading && habits.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white p-2 text-left font-medium text-slate-500">Habit</th>
                {dates.map((date) => (
                  <th
                    key={date}
                    className={`p-1 text-center font-medium ${date === today ? 'text-indigo-600' : 'text-slate-500'}`}
                  >
                    <div>{dayLabel(date)}</div>
                    <div className="text-xs">{dayNumber(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr key={habit.id} className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white p-2 text-left text-slate-900">{habit.name}</td>
                  {dates.map((date) => {
                    const completed = logs[logKey(habit.id, date)]?.completed ?? false
                    return (
                      <td key={date} className="p-1 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wager section */}
      <div className="mt-6">
        {wagerSent ? (
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
            Wager challenge sent! They'll see it when they open the app.
          </div>
        ) : showWagerForm ? (
          <form onSubmit={handleWager} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-3">
            <h3 className="font-semibold text-slate-900">Create a wager</h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Week</label>
              <select
                value={wagerWeek}
                onChange={(e) => setWagerWeek(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {WEEKS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                My target completion % — {myTarget}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={myTarget}
                onChange={(e) => setMyTarget(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">Your friend sets their own target when they accept.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">The stake (what you're wagering)</label>
              <input
                type="text"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder='e.g. "Loser buys coffee"'
                required
                maxLength={100}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {wagerError && <p className="text-xs text-red-600">{wagerError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWagerForm(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={wagerSending}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60"
              >
                {wagerSending ? 'Sending…' : 'Send challenge'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowWagerForm(true)}
            className="w-full rounded-xl border-2 border-dashed border-amber-300 p-4 text-sm font-medium text-amber-600 hover:bg-amber-50"
          >
            🏆 Challenge to a wager
          </button>
        )}
      </div>
    </div>
  )
}
