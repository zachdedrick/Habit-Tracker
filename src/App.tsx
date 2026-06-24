import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Today from './pages/Today'
import Week from './pages/Week'
import Dashboard from './pages/Dashboard'
import Archive from './pages/Archive'
import Insights from './pages/Insights'
import Import from './pages/Import'
import Friends from './pages/Friends'
import FriendProfile from './pages/FriendProfile'
import WagerDetail from './pages/WagerDetail'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="insights" element={<Insights />} />
        <Route path="week" element={<Week />} />
        <Route path="dashboard/:weekId" element={<Dashboard />} />
        <Route path="friends" element={<Friends />} />
        <Route path="friends/:friendId" element={<FriendProfile />} />
        <Route path="wager/:wagerId" element={<WagerDetail />} />
        <Route path="archive" element={<Archive />} />
        <Route path="import" element={<Import />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
