import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWagers } from '../hooks/useWagers'
import { useAuth } from '../contexts/auth'
import { formatWeekRange } from '../lib/dates'

function ProgressBar({ value, target, label }: { value: number; label: string; target: number }) {
  const pct = Math.round(value * 100)
  const hit = pct >= target
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-semibold ${hit ? 'text-emerald-600' : 'text-slate-500'}`}>
          {pct}% {hit ? '✓' : `/ ${target}% target`}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 relative overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${hit ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
          style={{ left: `${target}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-0.5">Target line at {target}%</p>
    </div>
  )
}

export default function WagerDetail() {
  const { wagerId } = useParams<{ wagerId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { wagers, respondToWager, cancelWager, loading } = useWagers()

  const [myTarget, setMyTarget] = useState(80)
  const [responding, setResponding] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)

  const wager = wagers.find((w) => w.id === wagerId)

  if (loading) return <p className="p-4 text-sm text-slate-500">Loading…</p>
  if (!wager) return <p className="p-4 text-sm text-red-600">Wager not found.</p>

  const isChallenger = wager.challenger_id === user?.id
  const opponent = isChallenger ? wager.challenged : wager.challenger
  const myProfile = isChallenger ? wager.challenger : wager.challenged
  const myTargetPct = isChallenger ? wager.challenger_target_pct : wager.challenged_target_pct
  const theirTargetPct = isChallenger ? wager.challenged_target_pct : wager.challenger_target_pct
  const myProgress = isChallenger ? wager.challengerProgress : wager.challengedProgress
  const theirProgress = isChallenger ? wager.challengedProgress : wager.challengerProgress
  const myResult = isChallenger ? wager.challengerResult : wager.challengedResult
  const theirResult = isChallenger ? wager.challengedResult : wager.challengerResult

  async function handleRespond(accept: boolean) {
    setResponseError(null)
    setResponding(true)
    try {
      await respondToWager(wager!.id, accept, accept ? myTarget : undefined)
      if (!accept) navigate(-1)
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : 'Failed to respond')
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-indigo-600">← Back</button>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              vs {opponent?.display_name ?? opponent?.email}
            </h2>
            <p className="text-sm text-slate-500">{formatWeekRange(wager.week_start)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            wager.status === 'active' ? 'bg-indigo-100 text-indigo-700' :
            wager.status === 'completed' ? 'bg-slate-100 text-slate-600' :
            wager.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-600'
          }`}>
            {wager.status.charAt(0).toUpperCase() + wager.status.slice(1)}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-slate-700">🏆 {wager.stake}</p>
      </div>

      {/* Pending: respond if challenged */}
      {wager.status === 'pending' && !isChallenger && (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 space-y-3">
          <p className="text-sm font-medium text-slate-900">
            {wager.challenger?.display_name ?? wager.challenger?.email} challenged you!
          </p>
          <p className="text-sm text-slate-600">
            Their target: <strong>{wager.challenger_target_pct}%</strong>
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Your target — {myTarget}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={myTarget}
              onChange={(e) => setMyTarget(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {responseError && <p className="text-xs text-red-600">{responseError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRespond(false)}
              disabled={responding}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => handleRespond(true)}
              disabled={responding}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60"
            >
              {responding ? 'Accepting…' : 'Accept'}
            </button>
          </div>
        </div>
      )}

      {wager.status === 'pending' && isChallenger && (
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">
            Waiting for {opponent?.display_name ?? opponent?.email} to accept your challenge.
          </p>
          <p className="text-sm mt-1">Your target: <strong>{wager.challenger_target_pct}%</strong></p>
          <button
            type="button"
            onClick={() => cancelWager(wager.id).then(() => navigate(-1))}
            className="mt-3 text-xs text-red-500 hover:underline"
          >
            Cancel wager
          </button>
        </div>
      )}

      {/* Active / Completed progress */}
      {(wager.status === 'active' || wager.status === 'completed') && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 className="font-semibold text-slate-900">Progress</h3>

          <ProgressBar
            label={`You (${myProfile?.display_name ?? myProfile?.email ?? 'Me'})`}
            value={myProgress ?? 0}
            target={myTargetPct ?? 0}
          />
          {theirTargetPct != null && (
            <ProgressBar
              label={opponent?.display_name ?? opponent?.email ?? 'Them'}
              value={theirProgress ?? 0}
              target={theirTargetPct}
            />
          )}

          {wager.status === 'completed' && (
            <div className={`rounded-lg p-3 text-sm font-medium ${
              myResult === 'won' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {myResult === 'won' && theirResult === 'won' && '🎉 You both hit your targets — everyone wins!'}
              {myResult === 'lost' && theirResult === 'lost' && '😬 Neither of you hit your targets.'}
              {myResult === 'won' && theirResult === 'lost' && '🏆 You hit your target and they didn\'t — you win!'}
              {myResult === 'lost' && theirResult === 'won' && '😔 They hit their target and you didn\'t — they win.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
