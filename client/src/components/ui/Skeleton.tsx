import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'wave',
}) => {
  const baseClasses = 'bg-gray-200'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton',
    none: '',
  }
  
  const style: React.CSSProperties = {
    width: width,
    height: height,
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton layouts
type CardSkeletonProps = {
  className?: string
  children?: React.ReactNode
}

export const CardSkeleton = ({ className = '', children }: CardSkeletonProps) => (
  <div className={`bg-white rounded-2xl p-6 border border-gray-100 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton className="w-24 mb-2" />
        <Skeleton className="w-16" height={12} />
      </div>
    </div>
    <Skeleton className="w-full mb-2" />
    <Skeleton className="w-3/4" />

    {children ? <div className="mt-4">{children}</div> : null}
  </div>
)

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton className="w-12" height={12} />
    </div>
    <Skeleton className="w-20 mb-1" height={28} />
    <Skeleton className="w-16" height={12} />
  </div>
)

export const TransactionSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 py-3">
    <Skeleton variant="circular" width={44} height={44} />
    <div className="flex-1">
      <Skeleton className="w-28 mb-2" />
      <Skeleton className="w-20" height={12} />
    </div>
    <Skeleton className="w-16" height={20} />
  </div>
)

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <TransactionSkeleton key={i} />
    ))}
  </div>
)

export const DashboardSkeleton: React.FC = () => (
  <div className="p-4 lg:p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="w-32 mb-2" height={24} />
        <Skeleton className="w-48" height={14} />
      </div>
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid lg:grid-cols-2 gap-6">
      <CardSkeleton className="h-64" />
      <CardSkeleton className="h-64" />
    </div>
    
    {/* Transactions */}
    <CardSkeleton>
      <ListSkeleton count={5} />
    </CardSkeleton>
  </div>
)

export default Skeleton
