import { api, PedigreeNode } from '@/lib/api'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

const GENERATION_COLORS = [
  'bg-truenicks-navy text-white',
  'bg-blue-700 text-white',
  'bg-blue-500 text-white',
  'bg-blue-300 text-blue-900',
  'bg-blue-100 text-blue-900',
]

function collectAllNames(node: PedigreeNode | null | undefined): string[] {
  if (!node) return []
  return [
    node.horse_name || '',
    ...collectAllNames(node.sire),
    ...collectAllNames(node.dam),
  ].filter(Boolean)
}

function findDuplicates(node: PedigreeNode | null | undefined): Set<string> {
  const names = collectAllNames(node)
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  names.forEach(n => {
    if (seen.has(n)) duplicates.add(n)
    else seen.add(n)
  })
  return duplicates
}

function PedigreeBox({
  node,
  generation,
  duplicates,
}: {
  node: PedigreeNode | null | undefined
  generation: number
  duplicates: Set<string>
}) {
  if (!node || !node.horse_name) {
    return (
      <div className="border border-dashed border-gray-300 rounded px-2 py-1 text-xs text-gray-400 bg-white min-w-[100px]">
        Unknown
      </div>
    )
  }
  const isDuplicate = duplicates.has(node.horse_name)
  const colorClass = isDuplicate ? 'bg-orange-200 text-orange-900 border-orange-400' : GENERATION_COLORS[Math.min(generation, GENERATION_COLORS.length - 1)]
  return (
    <div className={`border rounded px-2 py-1 text-xs font-medium min-w-[100px] max-w-[160px] text-center leading-tight ${colorClass} ${isDuplicate ? 'border-2' : 'border'}`}>
      {node.horse_name}
      {isDuplicate && <span className="block text-orange-600 text-[10px] font-bold mt-0.5">INBRED</span>}
    </div>
  )
}

function PedigreeTree({
  node,
  generation,
  maxGen,
  duplicates,
}: {
  node: PedigreeNode | null | undefined
  generation: number
  maxGen: number
  duplicates: Set<string>
}) {
  if (!node || generation > maxGen) return null

  const hasSire = node.sire && generation < maxGen
  const hasDam = node.dam && generation < maxGen

  return (
    <div className="flex items-center gap-1">
      <PedigreeBox node={node} generation={generation} duplicates={duplicates} />
      {(hasSire || hasDam) && generation < maxGen && (
        <div className="flex flex-col gap-1">
          <PedigreeTree node={node.sire} generation={generation + 1} maxGen={maxGen} duplicates={duplicates} />
          <PedigreeTree node={node.dam} generation={generation + 1} maxGen={maxGen} duplicates={duplicates} />
        </div>
      )}
    </div>
  )
}

export default async function PedigreePage({ params }: Props) {
  const horseId = parseInt(params.id, 10)
  let pedigree: PedigreeNode | null = null
  let horse = null
  let error = null

  try {
    [pedigree, horse] = await Promise.all([
      api.getPedigree(horseId, 5),
      api.getHorse(horseId),
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load pedigree'
  }

  const duplicates = pedigree ? findDuplicates(pedigree) : new Set<string>()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/stallions/${horseId}`} className="text-sm text-truenicks-navy hover:underline">
          ← Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Pedigree: {horse?.horse_name ?? `Horse #${horseId}`}
        </h1>
        {duplicates.size > 0 && (
          <p className="text-sm text-orange-600 mt-1 font-medium">
            Inbreeding detected: {Array.from(duplicates).join(', ')} appear multiple times
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      )}

      {pedigree && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            {GENERATION_COLORS.map((c, i) => (
              <span key={i} className={`px-2 py-1 rounded ${c} border`}>Gen {i + 1}</span>
            ))}
            <span className="px-2 py-1 rounded bg-orange-200 text-orange-900 border-2 border-orange-400">Inbred ancestor</span>
          </div>
          <div className="min-w-max">
            <PedigreeTree node={pedigree} generation={0} maxGen={4} duplicates={duplicates} />
          </div>
        </div>
      )}

      {!pedigree && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          No pedigree data available for this horse.
        </div>
      )}
    </div>
  )
}
