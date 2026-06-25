import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth'

async function upsertProfile(id: string, email: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id, email }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) console.error('Profile upsert failed:', error.message)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) {
        void upsertProfile(data.session.user.id, data.session.user.email ?? '')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
      if (newSession?.user) {
        void upsertProfile(newSession.user.id, newSession.user.email ?? '')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
