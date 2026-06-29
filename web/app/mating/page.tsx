'use client'

import { useState, useEffect } from 'react'
import { api, Horse, NickRating } from '@/lib/api'
import GradeBadge from '@/components/GradeBadge'

export default function MatingPage() {
  const [stallionSearch, setStallionSearch] = useState('')
  const [suggestions, setSuggestions] = useState<Horse[]>([])
  const [selectedStallion, setSelectedStallion] = useState<Horse | null>(null)
  const [mareName, setMareName] = useState('')
  const [result, setResult] = useState<NickRating | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!stallionSearch || stallionSearch.length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getStallions({ search: stallionSearch, page_size: 8 })
        setSuggestions(res.items || [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [stallionSearch])

  const selectStallion = (horse: Horse) => {
    setSelectedStallion(horse)
    setStallionSearch(horse.horse_name)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const checkNick = async () => {
    if (!selectedStallion || !mareName.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const rating = await api.getMatingNick(selectedStallion.horse_id, mareName.trim())
      setResult(rating)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve nick rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hypothetical Mating Tool</h1>
        <p className="text-gray-500 mt-1">Check the nick grade between a stallion and a mare&apos;s bloodline</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
        <div className="space-y-5">
          {/* Stallion search */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stallion <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search stallion name..."
              value={stallionSearch}
              onChange={e => {
                setStallionSearch(e.target.value)
                setSelectedStallion(null)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-truenicks-navy focus:border-transparent"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.horse_id}
                    onClick={() => selectStallion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium">{s.horse_name}</span>
                    {s.sire_name && <span className="text-gray-400 ml-2 text-xs">by {s.sire_name}</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedStallion && (
              <p className="text-xs text-grade-ap-plus mt-1">
                Selected: {selectedStallion.horse_name}
                {selectedStallion.sire_name ? ` (by ${selectedStallion.sire_name})` : ''}
              </p>
            )}
          </div>

          {/* Mare name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mare Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter mare's name..."
              value={mareName}
              onChange={e => setMareName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkNick()}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-truenicks-navy focus:border-transparent"
            />
          </div>

          <button
            onClick={checkNick}
            disabled={!selectedStallion || !mareName.trim() || loading}
            className="w-full bg-truenicks-navy text-white font-semibold py-3 rounded-lg hover:bg-truenicks-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking...' : 'Check Nick Grade'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-700 mb-6">
            Mating Result: {selectedStallion?.horse_name} × {mareName}
          </h2>

          {result.nick_grade === 'NR' || !result.nick_grade ? (
            <div className="text-center py-6">
              <GradeBadge grade="NR" size="xl" />
              <p className="text-gray-500 mt-4">Not Rated — insufficient data for this combination</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <GradeBadge grade={result.nick_grade} size="xl" />
                  <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Nick Grade</p>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">SII</div>
                    <div className="text-2xl font-bold text-truenicks-navy">{result.sii?.toFixed(2) ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">BSII</div>
                    <div className="text-2xl font-bold text-truenicks-navy">{result.bsii?.toFixed(2) ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sample Size</div>
                    <div className="text-2xl font-bold text-truenicks-navy">{result.sample_size ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Stakes Winners</div>
                    <div className="text-2xl font-bold text-truenicks-navy">{result.stakes_winners ?? '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm max-w-2xl">{error}</div>
      )}
    </div>
  )
}
