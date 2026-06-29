'use client'

interface GradeBadgeProps {
  grade?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
}

const GRADE_CONFIG: Record<string, { bg: string; label: string; text: string }> = {
  'A++': { bg: '#1a7a1a', label: 'A++', text: 'white' },
  'A+':  { bg: '#2d8a2d', label: 'A+',  text: 'white' },
  'A':   { bg: '#4aa04a', label: 'A',   text: 'white' },
  'B':   { bg: '#2255aa', label: 'B',   text: 'white' },
  'C':   { bg: '#cc7700', label: 'C',   text: 'white' },
  'D':   { bg: '#aa4400', label: 'D',   text: 'white' },
  'F':   { bg: '#cc2200', label: 'F',   text: 'white' },
  'NR':  { bg: '#888888', label: 'NR',  text: 'white' },
}

const SIZE_CLASSES = {
  sm:  'text-xs px-1.5 py-0.5 rounded',
  md:  'text-sm px-2.5 py-1 rounded',
  lg:  'text-base px-3 py-1.5 rounded-md font-bold',
  xl:  'text-4xl px-6 py-3 rounded-lg font-black tracking-tight',
}

export default function GradeBadge({ grade, size = 'md', showLabel = false }: GradeBadgeProps) {
  const normalized = (grade || 'NR').toUpperCase().trim()
  const config = GRADE_CONFIG[normalized] || GRADE_CONFIG['NR']
  const sizeClass = SIZE_CLASSES[size]

  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${sizeClass}`}
      style={{ backgroundColor: config.bg, color: config.text }}
      title={`Grade: ${config.label}`}
    >
      {config.label}
    </span>
  )
}

export function GradeScale() {
  const grades = ['A++', 'A+', 'A', 'B', 'C', 'D', 'F', 'NR']
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {grades.map(g => (
        <div key={g} className="flex flex-col items-center gap-1">
          <GradeBadge grade={g} size="md" />
        </div>
      ))}
    </div>
  )
}
