import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'TrueNicks - Thoroughbred Breeding Intelligence',
  description: 'Advanced nick rating and pedigree analysis for thoroughbred breeding decisions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-truenicks-navy text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-2xl font-bold tracking-tight">TrueNicks</span>
                  <span className="text-xs text-blue-300 hidden sm:block">Breeding Intelligence</span>
                </Link>
                <div className="hidden md:flex items-center space-x-6">
                  <Link href="/stallions" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Stallions
                  </Link>
                  <Link href="/mating" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Mating Tool
                  </Link>
                  <Link href="/races" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Race Results
                  </Link>
                </div>
              </div>
              <div className="text-xs text-gray-400 hidden sm:block">
                Thoroughbred Data Platform
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-truenicks-navy text-gray-400 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm">
              <p className="font-semibold text-white mb-1">TrueNicks</p>
              <p>Thoroughbred Breeding Intelligence Platform</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
