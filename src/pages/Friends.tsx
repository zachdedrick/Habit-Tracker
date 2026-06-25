import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'
import { useWagers } from '../hooks/useWagers'
import type { Profile } from '../types'

function AvailableUser({ profile, onAdd }: { profile: Profile; onAdd: (id: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    setAdding(true)
    try {
      await onAdd(profile.id)
      setAdded(true)
    } finally {
      setAdding(false)
    }
  }

  return (
    <li className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-sm font-medium text-slate-900">{profile.display_name ?? profile.email}</p>
        <p className="text-xs text-slate-500">{profile.email}</p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding || added}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          added
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60'
        }`}
      >
        {added ? 'Sent ✓' : adding ? '…' : 'Add'}
      </button>
    </li>
  )
}

export default function Friends() {
  const { incoming, outgoing, friends, available, loading, error, sendRequest, sendRequestById, respondToRequest, removeFriend } = useFriends()
  const { pendingIncoming: wagerIncoming, active: activeWagers, loading: wagersLoading } = useWagers()

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  async function handleSendRequest(e: FormEvent) {
    e.preventDefault()
    setSendError(null)
    setSendSuccess(false)
    setSending(true)
    try {
      await sendRequest(email)
      setEmail('')
      setSendSuccess(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  const pendingCount = incoming.length + wagerIncoming.length

  if (loading || wagersLoading) return <p className="p-4 text-sm text-slate-500">Loading…</p>
  if (error) return <p className="p-4 text-sm text-red-600">{error}</p>

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Friends</h2>
        {pendingCount > 0 && (
          <p className="text-sm text-indigo-600 font-medium">{pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}</p>
        )}
      </div>

      {/* Incoming friend requests */}
      {incoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Friend requests</h3>
          <ul className="space-y-2">
            {incoming.map((req) => (
              <li key={req.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-900">
                  {req.sender?.display_name ?? req.sender?.email}
                </p>
                <p className="text-xs text-slate-500">{req.sender?.email}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondToRequest(req.id, true)}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToRequest(req.id, false)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Incoming wager challenges */}
      {wagerIncoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Wager challenges</h3>
          <ul className="space-y-2">
            {wagerIncoming.map((wager) => (
              <li key={wager.id} className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm font-medium text-slate-900">
                  {wager.challenger?.display_name ?? wager.challenger?.email} challenged you!
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Stake: <strong>{wager.stake}</strong> · Week of {wager.week_start} · Their target: {wager.challenger_target_pct}%
                </p>
                <Link
                  to={`/wager/${wager.id}`}
                  className="mt-3 block w-full rounded-lg bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-amber-400"
                >
                  View &amp; respond
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active wagers */}
      {activeWagers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Active wagers</h3>
          <ul className="space-y-2">
            {activeWagers.map((wager) => (
              <li key={wager.id}>
                <Link
                  to={`/wager/${wager.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    vs {wager.challenger?.id === wager.challenger_id
                      ? (wager.challenged?.display_name ?? wager.challenged?.email)
                      : (wager.challenger?.display_name ?? wager.challenger?.email)}
                  </p>
                  <p className="text-xs text-slate-500">Stake: {wager.stake} · Week of {wager.week_start}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Friends list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">My friends</h3>
        {friends.length === 0 && outgoing.length === 0 ? (
          <p className="text-sm text-slate-500">No friends yet — add one below.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((friend) => (
              <li key={friend.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {friend.display_name ?? friend.email}
                    </p>
                    <p className="text-xs text-slate-500">{friend.email}</p>
                  </div>
                  <Link
                    to={`/friends/${friend.id}`}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
            {outgoing.map((req) => (
              <li key={req.id} className="rounded-xl bg-slate-100 p-4">
                <p className="text-sm text-slate-600">
                  Request sent to <strong>{req.receiver?.email}</strong>
                </p>
                <p className="text-xs text-slate-400">Waiting for them to accept</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* People you can connect with */}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">People on Habit Tracker</h3>
          <ul className="space-y-2">
            {available.map((profile) => (
              <AvailableUser key={profile.id} profile={profile} onAdd={sendRequestById} />
            ))}
          </ul>
        </div>
      )}

      {/* Add friend by email */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Add by email</h3>
        <form onSubmit={handleSendRequest} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter their email address"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {sendError && <p className="text-xs text-red-600">{sendError}</p>}
          {sendSuccess && <p className="text-xs text-emerald-600">Friend request sent!</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send friend request'}
          </button>
        </form>
      </div>

      {/* Remove friend (hidden in details) */}
      {friends.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2">Remove a friend</h3>
          <div className="flex flex-wrap gap-2">
            {friends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => removeFriend(friend.id)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-red-300 hover:text-red-500"
              >
                Remove {friend.display_name ?? friend.email}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
