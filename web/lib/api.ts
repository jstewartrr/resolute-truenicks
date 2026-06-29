const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000'

export interface Horse {
  horse_id: number
  horse_name: string
  sire_name?: string
  dam_name?: string
  color?: string
  sex?: string
  yob?: number
  country?: string
}

export interface NickRating {
  nick_id?: number
  stallion_id?: number
  stallion_name?: string
  broodmare_sire_id?: number
  broodmare_sire_name?: string
  sii?: number
  bsii?: number
  nick_grade?: string
  sample_size?: number
  stakes_winners?: number
  sw_pct?: number
}

export interface Race {
  race_id?: number
  race_date?: string
  track_code?: string
  track_name?: string
  race_number?: number
  race_name?: string
  race_grade?: string
  surface?: string
  distance?: string
  distance_furlongs?: number
  purse?: number
  country?: string
}

export interface SpeedFigure {
  figure_id?: number
  horse_id?: number
  figure_type?: string
  figure_value?: number
  race_date?: string
  track_code?: string
  surface?: string
}

export interface Workout {
  workout_id?: number
  horse_id?: number
  workout_date?: string
  track_code?: string
  distance?: string
  time_seconds?: number
  workout_note?: string
  track_condition?: string
}

export interface StatsResponse {
  horse_count?: number
  race_count?: number
  pedigree_link_count?: number
  nick_rating_count?: number
  speed_figure_count?: number
  workout_count?: number
  scraper_run_count?: number
  recent_races?: Race[]
  top_nick_ratings?: NickRating[]
}

export interface PedigreeNode {
  horse_id?: number
  horse_name?: string
  sire?: PedigreeNode
  dam?: PedigreeNode
  generation?: number
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  getStats: (): Promise<StatsResponse> =>
    apiFetch<StatsResponse>('/api/stats'),

  getStallions: (params?: { search?: string; page?: number; page_size?: number }): Promise<{ items: Horse[]; total: number; page: number; page_size: number }> => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.page_size) qs.set('page_size', String(params.page_size))
    return apiFetch(`/api/stallions?${qs}`)
  },

  getHorse: (id: number): Promise<Horse> =>
    apiFetch<Horse>(`/api/horses/${id}`),

  getNickRatings: (stallionId?: number): Promise<NickRating[]> => {
    const qs = stallionId ? `?stallion_id=${stallionId}` : ''
    return apiFetch<NickRating[]>(`/api/nick-ratings${qs}`)
  },

  getMatingNick: (stallionId: number, mareName: string): Promise<NickRating> =>
    apiFetch<NickRating>(`/api/nick-ratings/mating?stallion_id=${stallionId}&mare_name=${encodeURIComponent(mareName)}`),

  getPedigree: (horseId: number, generations?: number): Promise<PedigreeNode> => {
    const qs = generations ? `?generations=${generations}` : ''
    return apiFetch<PedigreeNode>(`/api/pedigree/${horseId}${qs}`)
  },

  getRaces: (params?: { track?: string; surface?: string; page?: number; page_size?: number }): Promise<{ items: Race[]; total: number; page: number; page_size: number }> => {
    const qs = new URLSearchParams()
    if (params?.track) qs.set('track', params.track)
    if (params?.surface) qs.set('surface', params.surface)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.page_size) qs.set('page_size', String(params.page_size))
    return apiFetch(`/api/races?${qs}`)
  },

  getSpeedFigures: (horseId: number): Promise<SpeedFigure[]> =>
    apiFetch<SpeedFigure[]>(`/api/horses/${horseId}/figures`),

  getWorkouts: (horseId: number): Promise<Workout[]> =>
    apiFetch<Workout[]>(`/api/horses/${horseId}/workouts`),
}
