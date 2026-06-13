import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseHabitCsv, type ParsedCsv } from '../lib/csv'
import { useCsvImport } from '../hooks/useCsvImport'
import { formatDateLong } from '../lib/dates'

export default function Import() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { importData, importing, progress, error } = useCsvImport()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setParsed(null)
    setDone(false)

    try {
      const text = await file.text()
      const result = parseHabitCsv(text)
      if (result.entries.length === 0) {
        throw new Error('No valid rows found. Make sure the first column contains dates.')
      }
      setParsed(result)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }

  async function handleImport() {
    if (!parsed) return
    await importData(parsed)
    setDone(true)
  }

  return (
    <div className="p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-indigo-600">
        ← Back
      </button>

      <h2 className="mt-2 text-lg font-semibold text-slate-900">Import past weeks</h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload a CSV exported from your Excel sheet to bring in historical data.
      </p>

      <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        <p className="font-medium text-slate-900">CSV format</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>First column: <strong>Date</strong> (one row per day, e.g. 2026-01-05 or 1/5/2026)</li>
          <li>Each remaining column: a habit name</li>
          <li>Cell values: <strong>1</strong> for completed, blank or <strong>0</strong> for not completed</li>
        </ul>
        <p className="mt-2">
          In Excel: <em>File → Save As → CSV (Comma delimited)</em>, then upload that file below.
        </p>
      </div>

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
      </div>

      {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}

      {parsed && !done && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-900">Ready to import</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>{parsed.entries.length} days of data</li>
            <li>
              {formatDateLong(parsed.entries[0].date)} – {formatDateLong(parsed.entries[parsed.entries.length - 1].date)}
            </li>
            <li>{parsed.habitNames.length} habits: {parsed.habitNames.join(', ')}</li>
            {parsed.skippedRows > 0 && (
              <li className="text-amber-600">{parsed.skippedRows} row(s) skipped (unrecognized date)</li>
            )}
          </ul>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {importing
              ? progress
                ? `Importing week ${progress.completedWeeks} of ${progress.totalWeeks}…`
                : 'Importing…'
              : 'Import data'}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {done && !error && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
          Import complete! Visit the Archive tab to view your past weeks.
        </div>
      )}
    </div>
  )
}
