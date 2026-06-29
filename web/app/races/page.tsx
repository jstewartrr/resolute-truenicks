'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, Race } from '@/lib/api'
import GradeBadge from '@/components/GradeBadge'

const SURFACES = ['All', 'Dirt', 'Turf', 'Synthetic', 'Poly']

export default function RacesPage() {
  const [races, setRaces] = useState<Race[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [trackFilter, setTrackFilter] = useState('')
  const [surfaceFilter, setSurfaceFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 25

  const fetchRaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getRaces({
        track: trackFilter || undefined,
        surface: surfaceFilter || undefined,
        page,
        page_size: pageSize,
      })
      setRaces(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load races')
      setRaces([])
    } finally {
      setLoading(false)
    }
  }, [trackFilter, surfaceFilter, page])

  useEffect(() => {
    fetchRaces()
  }, [fetchRaces])

  useEffect(() => {
    setPage(1)
  }, [trackFilter, surfaceFilter])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Race Results</h1>
        <p className="text-gray-500 mt-1">Browse race history across all tracks</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by track..."
          value={trackFilter}
          onChange={e => setTrackFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-truenicks-navy"
        />
        <select
          value={surfaceFilter}
          onChange={e => setSurfaceFilter(e.target.value === 'All' ? '' : e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-truenicks-navy bg-white"
        >
          {SURFACES.map(s => <option key={s}>{s}</option>)}
        </select>
        {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
        {!loading && total > 0 && <span className="text-sm text-gray-500">{total.toLocaleString()} results</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Track</th>
                <th>Race #</th>
                <th>Race Name</th>
                <th>Grade</th>
                <th>Surface</th>
                <th>Distance</th>
                <th>Purse</th>
              </tr>
            </thead>
            <tbody>
              {races.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No races found</td>
                </tr>
              ) : races.map((race, i) => (
                <tr key={race.race_id ?? i}>
                  <td>{race.race_date ?? '-'}</td>
                  <td className="font-medium">{race.track_name ?? race.track_code ?? '-'}</td>
                  <td>{race.race_number ?? '-'}</td>
                  <td>{race.race_name ?? '-'}</td>
                  <td>{race.race_grade ? <GradeBadge grade={race.race_grade} size="sm" /> : '-'}</td>
                  <td>{race.surface ?? '-'}</td>
                  <td>{race.distance ?? (race.distance_furlongs ? `${race.distance_furlongs}f` : '-')}</td>
                  <td>{race.purse ? `$${race.purse.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
