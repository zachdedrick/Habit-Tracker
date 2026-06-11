import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const tabs = [
  { to: '/', label: 'Today', icon: '✓' },
  { to: '/week', label: 'Week', icon: '📅' },
  { to: '/archive', label: 'Archive', icon: '🗂' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900">Habit Tracker</h1>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-xl -translate-x-1/2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
