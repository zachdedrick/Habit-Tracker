import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useWeekData, logKey } from '../hooks/useWeekData'
import {
  dayLabel,
  dayNumber,
  formatDateLong,
  formatWeekRange,
  getWeekDates,
  getWeekStart,
  shiftWeek,
  todayStr,
} from '../lib/dates'
import NoteModal from '../components/NoteModal'

export default function Week() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const weekStart = searchParams.get('week') ?? getWeekStart()
  const previousWeekStart = shiftWeek(weekStart, -1)

  const {
    week, habits, logs, bonuses, loading, error,
    addHabit, renameHabit, deleteHabit, copyHabitsFrom,
    toggleCompleted, setNote,
    addBonus, removeBonus, toggleBonus, copyBonusesFrom,
  } = useWeekData(weekStart)
  const previous = useWeekData(previousWeekStart)

  const [newHabitName, setNewHabitName] = useState('')
  const [newBonusName, setNewBonusName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [noteTarget, setNoteTarget] = useState<{ habitId: string; date: string } | null>(null)
  const [managing, setManaging] = useState(false)
  const [managingBonuses, setManagingBonuses] = useState(false)

  const dates = getWeekDates(weekStart)
  const today = todayStr()
  const isCurrentWeek = weekStart === getWeekStart()

  function goToWeek(start: string) {
    navigate(`/week?week=${start}`)
  }

  async function handleAddHabit(e: FormEvent) {
    e.preventDefault()
    await addHabit(newHabitName)
    setNewHabitName('')
  }

  async function handleRename(habitId: string) {
    await renameHabit(habitId, editingName)
    setEditingId(null)
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">{error}</p>
  }

  const noteHabit = habits.find((h) => h.id === noteTarget?.habitId)

  // Weekly completion % inclusive of bonuses
  const completedLogs = habits.reduce(
    (sum, h) => sum + dates.filter((d) => logs[logKey(h.id, d)]?.completed).length,
    0,
  )
  const completedBonuses = bonuses.filter((b) => b.completed).length
  const totalSlots = habits.length * 7 + bonuses.length
  const weeklyPct = totalSlots > 0 ? Math.round(((completedLogs + completedBonuses) / totalSlots) * 100) : null

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToWeek(previousWeekStart)}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          aria-label="Previous week"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">{formatWeekRange(weekStart)}</p>
          {!isCurrentWeek && (
            <button type="button" onClick={() => goToWeek(getWeekStart())} className="text-xs text-indigo-600">
              Back to this week
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => goToWeek(shiftWeek(weekStart, 1))}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {/* Weekly % + Dashboard button */}
      {week && (
        <div className="mt-4 flex gap-3">
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-white py-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">This week</p>
            <p className="mt-0.5 text-2xl font-bold text-indigo-600">
              {weeklyPct !== null ? `${weeklyPct}%` : '—'}
            </p>
          </div>
          <Link
            to={`/dashboard/${week.id}`}
            className="flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500"
          >
            View weekly dashboard
          </Link>
        </div>
      )}

      {habits.length === 0 && previous.habits.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center">
          <p className="text-sm text-slate-600">Start this week with last week's habits?</p>
          <button
            type="button"
            onClick={() => copyHabitsFrom(previous.week!.id)}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Copy last week's habits
          </button>
        </div>
      )}

      {habits.length > 0 && (
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
                  <td className="sticky left-0 bg-white p-2 text-left font-medium text-slate-900">
                    {editingId === habit.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRename(habit.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(habit.id)}
                        className="w-28 rounded border border-slate-300 px-1.5 py-1 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => {
                          if (!managing) return
                          setEditingId(habit.id)
                          setEditingName(habit.name)
                        }}
                      >
                        {habit.name}
                      </button>
                    )}
                  </td>
                  {dates.map((date) => {
                    const log = logs[logKey(habit.id, date)]
                    const state = !log ? 'none' : log.completed ? 'done' : 'missed'
                    const hasNote = !!log?.note
                    return (
                      <td key={date} className="p-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => toggleCompleted(habit.id, date)}
                            aria-label={state === 'done' ? 'Mark missed' : state === 'missed' ? 'Clear' : 'Mark complete'}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                              state === 'done'
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : state === 'missed'
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-slate-300 text-transparent'
                            }`}
                          >
                            {state === 'missed' ? '✕' : '✓'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoteTarget({ habitId: habit.id, date })}
                            aria-label="Add note"
                            className={`text-[11px] leading-none ${hasNote ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            📝
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  {managing && (
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => deleteHabit(habit.id)}
                        aria-label="Delete habit"
                        className="text-slate-400 hover:text-red-500"
                      >
                        🗑
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setManaging((m) => !m)}
          className="text-sm font-medium text-indigo-600"
        >
          {managing ? 'Done editing' : 'Manage habits'}
        </button>

        {managing && (
          <form onSubmit={handleAddHabit} className="mt-2 flex gap-2">
            <input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="New habit name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* Weekly bonuses */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Weekly bonuses</h3>
            <p className="text-xs text-slate-500">Extra goals that count toward your weekly total</p>
          </div>
          <button
            type="button"
            onClick={() => setManagingBonuses((m) => !m)}
            className="text-xs font-medium text-indigo-600"
          >
            {managingBonuses ? 'Done' : 'Manage'}
          </button>
        </div>

        {/* Copy from last week prompt */}
        {bonuses.length === 0 && previous.bonuses.length > 0 && (
          <div className="mb-3 rounded-xl border border-dashed border-slate-300 p-3 text-center">
            <p className="text-sm text-slate-600">Use last week's bonuses?</p>
            <button
              type="button"
              onClick={() => copyBonusesFrom(previous.week!.id)}
              className="mt-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Copy last week's bonuses
            </button>
          </div>
        )}

        {bonuses.length > 0 && (
          <ul className="mb-3 space-y-2">
            {bonuses.map((bonus) => (
              <li
                key={bonus.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  onClick={() => toggleBonus(bonus.id)}
                  aria-label={bonus.completed ? 'Mark incomplete' : 'Mark complete'}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                    bonus.completed
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <span className={`flex-1 text-sm ${bonus.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {bonus.name}
                </span>
                {managingBonuses && (
                  <button
                    type="button"
                    onClick={() => removeBonus(bonus.id)}
                    aria-label="Remove bonus"
                    className="text-slate-400 hover:text-red-500"
                  >
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {managingBonuses && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await addBonus(newBonusName)
              setNewBonusName('')
            }}
            className="flex gap-2"
          >
            <input
              value={newBonusName}
              onChange={(e) => setNewBonusName(e.target.value)}
              placeholder="New bonus (e.g. extra workout)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add
            </button>
          </form>
        )}

        {bonuses.length === 0 && !managingBonuses && previous.bonuses.length === 0 && (
          <p className="text-sm text-slate-400">No bonuses yet — tap Manage to add some.</p>
        )}
      </div>

      {noteHabit && noteTarget && (
        <NoteModal
          habitName={noteHabit.name}
          dateLabel={formatDateLong(noteTarget.date)}
          initialNote={logs[logKey(noteTarget.habitId, noteTarget.date)]?.note ?? ''}
          onSave={(note) => setNote(noteTarget.habitId, noteTarget.date, note)}
          onClose={() => setNoteTarget(null)}
        />
      )}
    </div>
  )
}
