import { api } from '@/lib/api'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default async function FiguresPage({ params }: Props) {
  const horseId = parseInt(params.id, 10)
  let figures = null
  let horse = null
  let error = null

  try {
    [figures, horse] = await Promise.all([
      api.getSpeedFigures(horseId),
      api.getHorse(horseId),
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load figures'
  }

  // Group by figure type
  const byType: Record<string, typeof figures> = {}
  figures?.forEach(f => {
    const t = f.figure_type || 'Unknown'
    if (!byType[t]) byType[t] = []
    byType[t]!.push(f)
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/stallions/${horseId}`} className="text-sm text-truenicks-navy hover:underline">
          ← Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Speed Figures: {horse?.horse_name ?? `Horse #${horseId}`}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      )}

      {!error && Object.keys(byType).length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          No speed figures available for this horse.
        </div>
      )}

      {!error && Object.entries(byType).map(([figType, figs]) => (
        <div key={figType}>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{figType}</h2>
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Track</th>
                  <th>Surface</th>
                  <th>Figure</th>
                </tr>
              </thead>
              <tbody>
                {(figs || []).map((f, i) => (
                  <tr key={f.figure_id ?? i}>
                    <td>{f.race_date ?? '-'}</td>
                    <td>{f.track_code ?? '-'}</td>
                    <td>{f.surface ?? '-'}</td>
                    <td className="font-mono font-bold text-truenicks-navy">{f.figure_value ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
