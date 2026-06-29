'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, Horse } from '@/lib/api'
import HorseTable from '@/components/HorseTable'
import Link from 'next/link'

export default function StallionsPage() {
  const [horses, setHorses] = useState<Horse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 25

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  const fetchHorses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getStallions({ search: debouncedSearch || undefined, page, page_size: pageSize })
      setHorses(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stallions')
      setHorses([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    fetchHorses()
  }, [fetchHorses])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Stallion Directory</h1>
        <p className="text-gray-500 mt-1">Browse and search thoroughbred stallions in the database</p>
      </div>

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search stallions by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-truenicks-navy focus:border-transparent"
        />
        {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
        {!loading && total > 0 && <span className="text-sm text-gray-500">{total.toLocaleString()} results</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && <HorseTable horses={horses} />}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total.toLocaleString()} total)
          </span>
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
