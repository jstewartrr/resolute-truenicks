import { api, StatsResponse } from '@/lib/api'
import GradeBadge, { GradeScale } from '@/components/GradeBadge'
import Link from 'next/link'

async function getStats(): Promise<StatsResponse | null> {
  try {
    return await api.getStats()
  } catch {
    return null
  }
}

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="text-3xl font-bold text-truenicks-navy mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">{label}</div>
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="bg-truenicks-navy text-white rounded-xl p-10 shadow-lg">
        <h1 className="text-4xl font-bold mb-3">Thoroughbred Breeding Intelligence</h1>
        <p className="text-blue-200 text-lg max-w-2xl">
          Advanced nick ratings, pedigree analysis, and race data for informed breeding decisions.
          Powered by comprehensive historical performance data.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mating" className="bg-white text-truenicks-navy font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
            Check a Mating
          </Link>
          <Link href="/stallions" className="bg-truenicks-navy-light text-white border border-blue-400 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-800 transition-colors">
            Browse Stallions
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Database Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Horses" value={stats?.horse_count ?? '-'} href="/stallions" />
          <StatCard label="Races" value={stats?.race_count ?? '-'} href="/races" />
          <StatCard label="Pedigree Links" value={stats?.pedigree_link_count ?? '-'} />
          <StatCard label="Nick Ratings" value={stats?.nick_rating_count ?? '-'} href="/mating" />
          <StatCard label="Speed Figures" value={stats?.speed_figure_count ?? '-'} />
          <StatCard label="Workouts" value={stats?.workout_count ?? '-'} />
          <StatCard label="Scraper Runs" value={stats?.scraper_run_count ?? '-'} />
        </div>
      </div>

      {/* Grade Scale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Nick Grade Scale</h2>
        <GradeScale />
        <p className="text-sm text-gray-500 mt-3">
          A++ represents the highest nick compatibility. Grades are calculated from Statistical Impact Index (SII) scores derived from historical stakes winner percentages.
        </p>
      </div>

      {/* Recent Races */}
      {stats?.recent_races && stats.recent_races.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Races</h2>
            <Link href="/races" className="text-sm text-truenicks-navy font-medium hover:underline">
              View all races
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Track</th>
                  <th>Race</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Surface</th>
                  <th>Distance</th>
                  <th>Purse</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_races.map((race, i) => (
                  <tr key={race.race_id ?? i}>
                    <td>{race.race_date ?? '-'}</td>
                    <td className="font-medium">{race.track_code ?? race.track_name ?? '-'}</td>
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
        </div>
      )}

      {/* Top Nick Ratings */}
      {stats?.top_nick_ratings && stats.top_nick_ratings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Top Nick Ratings by SII</h2>
            <Link href="/mating" className="text-sm text-truenicks-navy font-medium hover:underline">
              Check a mating
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stallion</th>
                  <th>Broodmare Sire</th>
                  <th>Grade</th>
                  <th>SII</th>
                  <th>BSII</th>
                  <th>Sample</th>
                  <th>Stakes Winners</th>
                  <th>SW%</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_nick_ratings.map((n, i) => (
                  <tr key={n.nick_id ?? i}>
                    <td className="text-gray-400 font-mono">{i + 1}</td>
                    <td className="font-medium text-truenicks-navy">{n.stallion_name ?? '-'}</td>
                    <td>{n.broodmare_sire_name ?? '-'}</td>
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

      {/* Empty state when API is down */}
      {!stats && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 font-medium">Backend API not available</p>
          <p className="text-amber-600 text-sm mt-1">Ensure the FastAPI backend is running on {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
        </div>
      )}
    </div>
  )
}
