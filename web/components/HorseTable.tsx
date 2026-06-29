'use client'

import Link from 'next/link'
import { Horse } from '@/lib/api'

interface HorseTableProps {
  horses: Horse[]
  showActions?: boolean
}

export default function HorseTable({ horses, showActions = true }: HorseTableProps) {
  if (!horses.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No horses found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sire</th>
            <th>Dam</th>
            <th>Color</th>
            <th>Sex</th>
            <th>YOB</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {horses.map(horse => (
            <tr key={horse.horse_id}>
              <td className="font-medium text-truenicks-navy">
                {horse.horse_name || 'Unknown'}
              </td>
              <td className="text-gray-600">{horse.sire_name || '-'}</td>
              <td className="text-gray-600">{horse.dam_name || '-'}</td>
              <td className="text-gray-600">{horse.color || '-'}</td>
              <td className="text-gray-600">{horse.sex || '-'}</td>
              <td className="text-gray-600">{horse.yob || '-'}</td>
              {showActions && (
                <td>
                  <div className="flex gap-2">
                    <Link
                      href={`/stallions/${horse.horse_id}`}
                      className="text-xs bg-truenicks-navy text-white px-2 py-1 rounded hover:bg-truenicks-navy-light transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/pedigree/${horse.horse_id}`}
                      className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                    >
                      Pedigree
                    </Link>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
