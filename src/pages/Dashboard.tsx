import { useNavigate, useParams } from 'react-router-dom'
import { useDashboardData } from '../hooks/useDashboardData'
import { formatDateLong, formatWeekRange } from '../lib/dates'

export default function Dashboard() {
  const { weekId } = useParams<{ weekId: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useDashboardData(weekId)

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>
  }

  if (error || !data) {
    return <p className="p-4 text-sm text-red-600">{error ?? 'Dashboard not found'}</p>
  }

  return (
    <div className="p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-indigo-600">
        ← Back
      </button>

      <h2 className="mt-2 text-lg font-semibold text-slate-900">Weekly Dashboard</h2>
      <p className="text-sm text-slate-500">{formatWeekRange(data.week.start_date)}</p>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-500">Overall completion</p>
        <p className="mt-1 text-3xl font-bold text-indigo-600">{Math.round(data.overallRate * 100)}%</p>
        <p className="mt-1 text-xs text-slate-400">
          {data.overallCompleted} of {data.overallTotal} habit-days completed
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {data.habitSummaries.map((summary) => (
          <div key={summary.habit.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">{summary.habit.name}</p>
              <p className="text-sm font-semibold text-indigo-600">{Math.round(summary.rate * 100)}%</p>
            </div>
            <p className="text-xs text-slate-400">
              {summary.completedCount} of {summary.totalDays} days
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-indigo-500"
                style={{ width: `${Math.round(summary.rate * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900">Reflections</h3>
        {data.habitSummaries.every((s) => s.notes.length === 0) ? (
          <p className="mt-2 text-sm text-slate-500">No notes recorded this week.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {data.habitSummaries
              .filter((s) => s.notes.length > 0)
              .map((summary) => (
                <div key={summary.habit.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="font-medium text-slate-900">{summary.habit.name}</p>
                  <ul className="mt-2 space-y-2">
                    {summary.notes.map((n) => (
                      <li key={n.date} className="text-sm">
                        <p className="text-xs font-medium text-slate-400">{formatDateLong(n.date)}</p>
                        <p className="text-slate-700">{n.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
