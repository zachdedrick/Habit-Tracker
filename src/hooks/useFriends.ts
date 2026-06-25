import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth'
import { getErrorMessage } from '../lib/errors'
import type { FriendRequest, Profile } from '../types'

export function useFriends() {
  const { user } = useAuth()
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [available, setAvailable] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [{ data: requests, error: reqError }, { data: allProfiles, error: profilesError }] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
        supabase.from('profiles').select('*').neq('id', user.id),
      ])
      if (reqError) throw reqError
      if (profilesError) throw profilesError

      const all = requests ?? []
      setIncoming(all.filter((r) => r.receiver_id === user.id && r.status === 'pending'))
      setOutgoing(all.filter((r) => r.sender_id === user.id && r.status === 'pending'))

      const accepted = all.filter((r) => r.status === 'accepted')
      const friendProfiles = accepted.map((r) =>
        r.sender_id === user.id ? (r.receiver as Profile) : (r.sender as Profile),
      )
      setFriends(friendProfiles.filter(Boolean))

      // Users with no existing connection (not friends, not pending either direction)
      const connectedIds = new Set(all.map((r) => r.sender_id === user.id ? r.receiver_id : r.sender_id))
      setAvailable((allProfiles ?? []).filter((p) => !connectedIds.has(p.id)))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load friends'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function sendRequestById(receiverId: string) {
    if (!user) return
    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert({ sender_id: user.id, receiver_id: receiverId })
    if (insertError) {
      if (insertError.code === '23505') throw new Error('Friend request already sent.')
      throw insertError
    }
    await load()
  }

  async function sendRequest(email: string) {
    if (!user) return
    const trimmed = email.trim().toLowerCase()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', trimmed)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile) throw new Error('No account found with that email address.')
    if (profile.id === user.id) throw new Error("That's your own email address.")

    await sendRequestById(profile.id)
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', requestId)
    if (updateError) throw updateError
    await load()
  }

  async function removeFriend(friendId: string) {
    if (!user) return
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
      )
    if (deleteError) throw deleteError
    await load()
  }

  return { incoming, outgoing, friends, available, loading, error, sendRequest, sendRequestById, respondToRequest, removeFriend, reload: load }
}
