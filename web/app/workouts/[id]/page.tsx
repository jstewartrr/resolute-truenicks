import { api } from '@/lib/api'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

function formatTime(seconds: number | undefined): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2).padStart(5, '0')
  return mins > 0 ? `${mins}:${secs}` : `0:${secs}`
}

export default async function WorkoutsPage({ params }: Props) {
  const horseId = parseInt(params.id, 10)
  let workouts = null
  let horse = null
  let error = null

  try {
    [workouts, horse] = await Promise.all([
      api.getWorkouts(horseId),
      api.getHorse(horseId),
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load workouts'
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/stallions/${horseId}`} className="text-sm text-truenicks-navy hover:underline">
          ← Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Workouts: {horse?.horse_name ?? `Horse #${horseId}`}
        </h1>
        <p className="text-gray-500 mt-1">
          {workouts ? `${workouts.length} workout${workouts.length !== 1 ? 's' : ''} on record` : ''}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      )}

      {!error && (!workouts || workouts.length === 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          No workouts available for this horse.
        </div>
      )}

      {!error && workouts && workouts.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Track</th>
                <th>Distance</th>
                <th>Time</th>
                <th>Condition</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w, i) => (
                <tr key={w.workout_id ?? i}>
                  <td>{w.workout_date ?? '-'}</td>
                  <td>{w.track_code ?? '-'}</td>
                  <td>{w.distance ?? '-'}</td>
                  <td className="font-mono">{formatTime(w.time_seconds)}</td>
                  <td>{w.track_condition ?? '-'}</td>
                  <td className="text-gray-500">{w.workout_note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
