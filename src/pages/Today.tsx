import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWeekData, logKey } from '../hooks/useWeekData'
import { getWeekStart, todayStr, formatDateLong } from '../lib/dates'
import NoteModal from '../components/NoteModal'

export default function Today() {
  const weekStart = getWeekStart()
  const today = todayStr()
  const { habits, logs, loading, error, toggleCompleted, setNote } = useWeekData(weekStart)
  const [noteHabitId, setNoteHabitId] = useState<string | null>(null)

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">{error}</p>
  }

  const noteHabit = habits.find((h) => h.id === noteHabitId)

  return (
    <div className="p-4">
      <p className="text-sm text-slate-500">{formatDateLong(today)}</p>

      {habits.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm text-slate-600">No habits set up for this week yet.</p>
          <Link
            to="/week"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Set up this week
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {habits.map((habit) => {
            const log = logs[logKey(habit.id, today)]
            const state = !log ? 'none' : log.completed ? 'done' : 'missed'
            const hasNote = !!log?.note
            return (
              <li
                key={habit.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  onClick={() => toggleCompleted(habit.id, today)}
                  aria-label={state === 'done' ? 'Mark missed' : state === 'missed' ? 'Clear' : 'Mark complete'}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                    state === 'done'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : state === 'missed'
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-slate-300 text-transparent'
                  }`}
                >
                  {state === 'missed' ? '✕' : '✓'}
                </button>
                <span className={`flex-1 text-base ${state === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {habit.name}
                </span>
                <button
                  type="button"
                  onClick={() => setNoteHabitId(habit.id)}
                  aria-label="Add note"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                    hasNote ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-slate-500'
                  }`}
                >
                  📝
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {noteHabit && (
        <NoteModal
          habitName={noteHabit.name}
          dateLabel={formatDateLong(today)}
          initialNote={logs[logKey(noteHabit.id, today)]?.note ?? ''}
          onSave={(note) => setNote(noteHabit.id, today, note)}
          onClose={() => setNoteHabitId(null)}
        />
      )}
    </div>
  )
}
