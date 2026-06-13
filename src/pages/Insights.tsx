import { useStatsData } from '../hooks/useStatsData'
import type { HabitRate } from '../hooks/useStatsData'

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function KpiCard({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-indigo-600">{pct(rate)}</p>
    </div>
  )
}

function HabitList({ title, habits, emptyText }: { title: string; habits: HabitRate[]; emptyText: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {habits.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {habits.map((habit) => (
            <li key={habit.name} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{habit.name}</span>
              <span className="font-semibold text-slate-900">{pct(habit.rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Insights() {
  const { data, loading, error } = useStatsData()

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>
  }

  if (error || !data) {
    return <p className="p-4 text-sm text-red-600">{error ?? 'No stats available'}</p>
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
      <p className="text-sm text-slate-500">Your completion rates at a glance</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <KpiCard label="Today" rate={data.todayRate} />
        <KpiCard label="Avg daily (this week)" rate={data.weekAvgDailyRate} />
        <KpiCard label="This week total" rate={data.weekTotalRate} />
        <KpiCard label="Last 30 days" rate={data.monthRate} />
      </div>

      <div className="mt-4 space-y-3">
        <HabitList title="Best performing habits (last 30 days)" habits={data.bestHabits} emptyText="No data yet." />
        <HabitList title="Needs attention (last 30 days)" habits={data.worstHabits} emptyText="Not enough habits yet to compare." />
      </div>
    </div>
  )
}
