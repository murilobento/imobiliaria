'use client'

import LoadingSpinner from './LoadingSpinner'

interface PageLoaderProps {
  loading?: boolean
  error?: string
  onRetry?: () => void
  children: React.ReactNode
  loadingText?: string
  minHeight?: string
}

export function PageLoader({
  loading = false,
  error,
  onRetry,
  children,
  loadingText = 'Carregando...',
  minHeight = '400px'
}: PageLoaderProps) {
  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ minHeight }}
      >
        <LoadingSpinner
          size="lg"
          text={loadingText}
          showNetworkStatus
        />
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ minHeight }}
      >
        <LoadingSpinner
          size="lg"
          error={error}
          onRetry={onRetry}
        />
      </div>
    )
  }

  return <>{children}</>
}

// Skeleton loader for table rows
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 py-4 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-200 rounded flex-1"
              style={{
                width: colIndex === 0 ? '25%' : colIndex === columns - 1 ? '15%' : 'auto'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Card skeleton loader
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}