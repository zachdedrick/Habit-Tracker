import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStatsData } from '../hooks/useStatsData'
import { useWeeklyTrend } from '../hooks/useWeeklyTrend'
import type { HabitRate } from '../hooks/useStatsData'

const OVERALL = '__overall__'

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

function TrendChart() {
  const { points, habitNames, loading, error } = useWeeklyTrend()
  const [selected, setSelected] = useState(OVERALL)

  if (loading) return <p className="text-sm text-slate-500">Loading chart…</p>
  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Complete at least 2 weeks of habits to see the trend line.
      </p>
    )
  }

  const chartData = points.map((p) => ({
    label: p.label,
    value:
      selected === OVERALL
        ? Math.round(p.overall * 100)
        : Math.round((p.byHabit[selected] ?? 0) * 100),
  }))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Weekly completion %</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value={OVERALL}>Overall (all habits)</option>
          {habitNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, selected === OVERALL ? 'Overall' : selected]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
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

      {/* Trend chart */}
      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Weekly trend</h3>
        <TrendChart />
      </div>

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <KpiCard label="Today" rate={data.todayRate} />
        <KpiCard label="Avg daily (this week)" rate={data.weekAvgDailyRate} />
        <KpiCard label="This week total" rate={data.weekTotalRate} />
        <KpiCard label="Last 30 days" rate={data.monthRate} />
      </div>

      {/* Best / worst habits */}
      <div className="mt-4 space-y-3">
        <HabitList title="Best performing habits (last 30 days)" habits={data.bestHabits} emptyText="No data yet." />
        <HabitList title="Needs attention (last 30 days)" habits={data.worstHabits} emptyText="Not enough habits yet to compare." />
      </div>
    </div>
  )
}
