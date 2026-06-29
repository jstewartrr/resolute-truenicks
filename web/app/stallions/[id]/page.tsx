import { api } from '@/lib/api'
import GradeBadge from '@/components/GradeBadge'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default async function StallionProfilePage({ params }: Props) {
  const horseId = parseInt(params.id, 10)
  let horse = null
  let nicks = null
  let error = null

  try {
    horse = await api.getHorse(horseId)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load horse'
  }

  if (!error && horse) {
    try {
      nicks = await api.getNickRatings(horseId)
    } catch {
      nicks = []
    }
  }

  if (error || !horse) {
    return (
      <div className="space-y-4">
        <Link href="/stallions" className="text-sm text-truenicks-navy hover:underline">← Back to Stallions</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || 'Horse not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/stallions" className="text-sm text-truenicks-navy hover:underline">← Back to Stallions</Link>
      </div>

      {/* Horse Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{horse.horse_name}</h1>
            <p className="text-gray-500 mt-1">
              {horse.sex || 'Unknown sex'} · {horse.color || 'Unknown color'} · {horse.yob ? `b. ${horse.yob}` : 'YOB unknown'}
              {horse.country ? ` · ${horse.country}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sire</div>
            <div className="font-semibold text-gray-800">{horse.sire_name || 'Unknown'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dam</div>
            <div className="font-semibold text-gray-800">{horse.dam_name || 'Unknown'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Color</div>
            <div className="font-semibold text-gray-800">{horse.color || 'Unknown'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sex</div>
            <div className="font-semibold text-gray-800">{horse.sex || 'Unknown'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/pedigree/${horse.horse_id}`}
            className="bg-truenicks-navy text-white font-medium px-4 py-2 rounded-lg hover:bg-truenicks-navy-light transition-colors text-sm"
          >
            View Pedigree
          </Link>
          <Link
            href={`/figures/${horse.horse_id}`}
            className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Speed Figures
          </Link>
          <Link
            href={`/workouts/${horse.horse_id}`}
            className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Workouts
          </Link>
        </div>
      </div>

      {/* Nick Ratings */}
      {nicks && nicks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Nick Ratings for {horse.horse_name}</h2>
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Broodmare Sire</th>
                  <th>Grade</th>
                  <th>SII</th>
                  <th>BSII</th>
                  <th>Sample Size</th>
                  <th>Stakes Winners</th>
                  <th>SW%</th>
                </tr>
              </thead>
              <tbody>
                {nicks.map((n, i) => (
                  <tr key={n.nick_id ?? i}>
                    <td className="font-medium">{n.broodmare_sire_name ?? '-'}</td>
                    <td><GradeBadge grade={n.nick_grade} size="sm" /></td>
                    <td className="font-mono">{n.sii?.toFixed(2) ?? '-'}</td>
                    <td className="font-mono">{n.bsii?.toFixed(2) ?? '-'}</td>
                    <td className="font-mono">{n.sample_size ?? '-'}</td>
                    <td className="font-mono">{n.stakes_winners ?? '-'}</td>
                    <td className="font-mono">{n.sw_pct != null ? `${(n.sw_pct * 100).toFixed(1)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nicks && nicks.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          No nick ratings found for this stallion.
        </div>
      )}
    </div>
  )
}
