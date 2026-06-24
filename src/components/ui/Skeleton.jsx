import React from 'react'

/**
 * Skeleton loading placeholder.
 * Usage: <Skeleton className="h-6 w-full" />
 *        <Skeleton circle size={40} />
 */
export function Skeleton({ className = '', circle = false, size }) {
  if (circle) {
    return (
      <span
        className="skeleton inline-block flex-shrink-0"
        style={{ width: size || 40, height: size || 40, borderRadius: '50%' }}
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className={`skeleton block ${className}`}
      aria-hidden="true"
    />
  )
}

/** A full dashboard stat-card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="mku-card flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/** A table row skeleton — pass rowCount */
export function TableSkeleton({ rows = 8, cols = 4 }) {
  return (
    <tbody aria-label="Loading data...">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border-color)]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className={`h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/** Profile page skeleton */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton circle size={64} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Course list skeleton */
export function CourseListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2.5 w-full" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
