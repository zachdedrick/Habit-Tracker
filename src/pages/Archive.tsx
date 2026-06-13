import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { formatWeekRange, getWeekStart } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import type { Week } from '../types'

export default function Archive() {
  const { user } = useAuth()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user!.id)
          .lt('start_date', getWeekStart())
          .order('start_date', { ascending: false })
        if (fetchError) throw fetchError
        if (!cancelled) setWeeks(data ?? [])
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load archive'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">{error}</p>
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Archive</h2>
          <p className="text-sm text-slate-500">Past weekly dashboards</p>
        </div>
        <Link
          to="/import"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Import data
        </Link>
      </div>

      {weeks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No past weeks yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {weeks.map((week) => (
            <li key={week.id}>
              <Link
                to={`/dashboard/${week.id}`}
                className="block rounded-xl bg-white p-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                {formatWeekRange(week.start_date)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
